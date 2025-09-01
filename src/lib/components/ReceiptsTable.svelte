<script lang="ts">
	import {
		Table,
		TableBody,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		TableBodyCell,
		Modal,
		Button
	} from 'flowbite-svelte';
	import type { CyToken, Receipt as ReceiptType } from '$lib/types';
	import { formatEther } from 'ethers';

	import ReceiptModal from '$lib/components/ReceiptModal.svelte';
	import Card from './Card.svelte';
	import balancesStore from '$lib/balancesStore';

	export let token: CyToken;

	export let receipts: ReceiptType[];
	let selectedReceipt: ReceiptType | null = null;
	let showReup = true;

	$: mappedReceipts = receipts.map((receipt) => {
		// Guard against undefined values
		if (!receipt.balance || !receipt.tokenId) {
			return {
				...receipt,
				totalsFlr: BigInt(0),
				readableFlrPerReceipt: '0.00000',
				readableTotalsFlr: '0.00000',
				readableReupPerUnderlying: '0.00000',
				readableReupTotal: '0.00000',
				reupTotal: BigInt(0)
			};
		}

		const balance = BigInt(receipt.balance);
		const tokenId = BigInt(receipt.tokenId);
		const totalsFlr = (balance * (10n ** 18n)) / tokenId;
		const flrPerReceipt = (10n ** 36n) / tokenId;
		const currentLockPrice = $balancesStore.stats[token.name]?.lockPrice || 0n;
		const addlPerUnderlying = currentLockPrice > tokenId ? currentLockPrice - tokenId : 0n;
		const addlTotal = (totalsFlr * addlPerUnderlying) / (10n ** 18n);

		return {
			...receipt,
			totalsFlr: totalsFlr,
			readableFlrPerReceipt: Number(formatEther(flrPerReceipt)).toFixed(5),
			readableTotalsFlr: Number(formatEther(totalsFlr)).toFixed(5),
			readableReupPerUnderlying: Number(formatEther(addlPerUnderlying)).toFixed(5),
			readableReupTotal: Number(formatEther(addlTotal)).toFixed(5),
			reupTotal: addlTotal
		};
	});

	$: grandTotalReup = mappedReceipts?.reduce?.((acc, r) => acc + (r.reupTotal ?? 0n), 0n) ?? 0n;
	$: readableGrandTotalReup = Number(formatEther(grandTotalReup)).toFixed(5);
</script>

<Card size="lg">
	<div class="mb-2 flex w-full items-center justify-end text-white">
		<label class="flex cursor-pointer items-center gap-2" title="Toggle visibility of re-up opportunity columns">
			<input type="checkbox" bind:checked={showReup} class="h-4 w-4" data-testid="reup-toggle" />
			<span>Show re-up details</span>
		</label>
	</div>
	<Table divClass="w-full" data-testid="receipts-table">
		<TableHead
			class="bg-opacity-0 bg-none p-1 text-white md:p-4 [&_th]:px-2 [&_th]:md:px-6"
			data-testid="headers"
		>
			<TableHeadCell>Total {token.underlyingSymbol} Locked</TableHeadCell>
			<TableHeadCell>Total {token.name} minted</TableHeadCell>
			<TableHeadCell>{token.name} per locked {token.underlyingSymbol}</TableHeadCell>
			{#if showReup}
				<TableHeadCell
					title="Additional cyToken per 1 underlying = max(0, current lock price − original lock price (tokenId))"
				>
					Addl {token.name} per 1 {token.underlyingSymbol}
				</TableHeadCell>
				<TableHeadCell
					title="Total additional cyToken = (Total {token.underlyingSymbol} locked for this receipt) × (Addl {token.name} per 1 {token.underlyingSymbol})"
				>
					Total addl {token.name}
				</TableHeadCell>
			{/if}
		</TableHead>
		<TableBody
			tableBodyClass="bg-opacity-0 [&_td]:text-white p-1 [&_td]:text-left [&_td]:px-2 [&_td]:md:px-6"
		>
			{#each mappedReceipts as receipt, index}
				<TableBodyRow class="bg-opacity-0 " data-testid={`receipt-row-${index}`}>
					<TableBodyCell class="" data-testid={`total-locked-${index}`}>
						{receipt.readableTotalsFlr}
					</TableBodyCell>
					<TableBodyCell data-testid={`number-held-${index}`}>
						{Number(formatEther(receipt.balance)).toFixed(5)}
					</TableBodyCell>
					<TableBodyCell data-testid={`locked-price-${index}`}>
						{Number(formatEther(receipt.tokenId)).toFixed(5)}
					</TableBodyCell>
					{#if showReup}
						<TableBodyCell
							data-testid={`reup-per-1-${index}`}
							title={`current: ${Number(formatEther($balancesStore.stats[token.name]?.lockPrice || 0n)).toFixed(5)}, original: ${Number(formatEther(receipt.tokenId)).toFixed(5)} → addl = max(0, current − original)`}
						>
							{receipt.readableReupPerUnderlying}
						</TableBodyCell>
						<TableBodyCell
							data-testid={`reup-total-${index}`}
							title={`total addl = ${receipt.readableTotalsFlr} ${token.underlyingSymbol} × ${receipt.readableReupPerUnderlying} ${token.name}/${token.underlyingSymbol}`}
						>
							{receipt.readableReupTotal}
						</TableBodyCell>
					{/if}
					<TableBodyCell class="">
						<Button
							class="flex items-center justify-center rounded-none border-2 border-white bg-primary px-2 py-1 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-neutral-600"
							data-testid={`redeem-button-${index}`}
							on:click={() => (selectedReceipt = receipt)}>Unlock</Button
						>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</Card>

{#if mappedReceipts?.length && showReup}
	<Card size="lg">
		<div class="flex w-full items-center justify-between font-semibold text-white">
			<span>Re-up opportunity (total)</span>
			<span data-testid="reup-total-sum">{readableGrandTotalReup} {token.name}</span>
		</div>
	</Card>
{/if}

{#if selectedReceipt}
	<Modal
		outsideclose={true}
		dismissable={true}
		on:close={() => (selectedReceipt = null)}
		defaultClass="bg-primary border-4 rounded-none inset h-fit"
		open={selectedReceipt ? true : false}
	>
		<ReceiptModal receipt={selectedReceipt} {token} />
	</Modal>
{/if}

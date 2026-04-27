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
	import { formatUnits } from 'viem';

	import ReceiptModal from '$lib/components/ReceiptModal.svelte';
	import Card from './Card.svelte';
	import balancesStore from '$lib/balancesStore';

	export let token: CyToken;

	export let receipts: ReceiptType[];
	let selectedReceipt: ReceiptType | null = null;
	let showReup = true;

	$: currentLockPrice = $balancesStore.stats[token.name]?.lockPrice ?? 0n;

	$: mappedReceipts = receipts.map((receipt) => {
		// Guard against undefined values
		if (!receipt.balance || !receipt.tokenId) {
			return {
				...receipt,
				totalsFlr: 0n,
				readableFlrPerReceipt: '0.00000',
				readableTotalsFlr: '0.00000',
				readableReupPerUnderlying: '0.00000',
				readableReupTotal: '0.00000',
				reupTotal: 0n
			};
		}

		const balance = BigInt(receipt.balance);
		const tokenId = BigInt(receipt.tokenId);

		// Calculate totals: (balance * 10^18) / tokenId
		// balance is in token.decimals, we scale to 18 decimals, then divide by tokenId (in 18 decimals)
		// Result is total underlying token locked in 18 decimals
		const totalsFlr = (balance * 10n ** 18n) / tokenId;

		// Calculate per-receipt: 10^36 / tokenId
		// This gives the cyToken per locked underlying token (in 18 decimals)
		const flrPerReceipt = 10n ** 36n / tokenId;

		// Re-up: if current lock price > the price at mint (tokenId), the receipt holder
		// could mint additional cyToken without locking more underlying.
		// addlPerUnderlying is in 18 decimals (USD price per 1 underlying).
		// reupTotal is in token.decimals (matches balance/totalsFlr).
		const addlPerUnderlying = currentLockPrice > tokenId ? currentLockPrice - tokenId : 0n;
		const reupTotal = (totalsFlr * addlPerUnderlying) / 10n ** 18n;

		return {
			...receipt,
			totalsFlr,
			readableFlrPerReceipt: Number(formatUnits(flrPerReceipt, token.decimals)).toFixed(5),
			readableTotalsFlr: Number(formatUnits(totalsFlr, token.decimals)).toFixed(5),
			readableReupPerUnderlying: Number(formatUnits(addlPerUnderlying, 18)).toFixed(5),
			readableReupTotal: Number(formatUnits(reupTotal, token.decimals)).toFixed(5),
			reupTotal
		};
	});

	$: grandTotalReup = mappedReceipts.reduce((acc, r) => acc + (r.reupTotal ?? 0n), 0n);
	$: readableGrandTotalReup = Number(formatUnits(grandTotalReup, token.decimals)).toFixed(5);
</script>

<Card size="lg">
	<div class="mb-2 flex w-full items-center justify-end text-white">
		<label
			class="flex cursor-pointer items-center gap-2"
			title="Toggle visibility of re-up opportunity columns"
		>
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
						{Number(formatUnits(receipt.balance, token.decimals)).toFixed(5)}
					</TableBodyCell>
					<TableBodyCell data-testid={`locked-price-${index}`}>
						{Number(formatUnits(BigInt(receipt.tokenId), 18)).toFixed(5)}
					</TableBodyCell>
					{#if showReup}
						<TableBodyCell
							data-testid={`reup-per-1-${index}`}
							title={`current: ${Number(formatUnits(currentLockPrice, 18)).toFixed(5)}, original: ${Number(formatUnits(BigInt(receipt.tokenId), 18)).toFixed(5)} → addl = max(0, current − original)`}
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

{#if mappedReceipts.length && showReup}
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

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

	export let token: CyToken;

	export let receipts: ReceiptType[];
	let selectedReceipt: ReceiptType | null = null;

	const mappedReceipts = receipts.map((receipt) => {
		// Guard against undefined values
		if (!receipt.balance || !receipt.tokenId) {
			return {
				...receipt,
				totalsFlr: BigInt(0),
				readableFlrPerReceipt: '0.00000',
				readableTotalsFlr: '0.00000'
			};
		}

		const balance = BigInt(receipt.balance);
		const tokenId = BigInt(receipt.tokenId);
		
		// Calculate totals: (balance * 10^18) / tokenId
		// balance is in token.decimals, we scale to 18 decimals, then divide by tokenId (in 18 decimals)
		// Result is total underlying token locked in 18 decimals
		const totalsFlr = (balance * BigInt(10 ** 18)) / tokenId;
		
		// Calculate per-receipt: 10^36 / tokenId
		// This gives the cyToken per locked underlying token (in 18 decimals)
		const flrPerReceipt = BigInt(10 ** 36) / tokenId;

		return {
			...receipt,
			totalsFlr: totalsFlr,
			readableFlrPerReceipt: Number(formatUnits(flrPerReceipt, token.decimals)).toFixed(5),
			readableTotalsFlr: Number(formatUnits(totalsFlr, token.decimals)).toFixed(5)
		};
	});
</script>

<Card size="lg">
	<Table divClass="w-full" data-testid="receipts-table">
		<TableHead
			class="bg-opacity-0 bg-none p-1 text-white md:p-4 [&_th]:px-2 [&_th]:md:px-6"
			data-testid="headers"
		>
			<TableHeadCell>Total {token.underlyingSymbol} Locked</TableHeadCell>
			<TableHeadCell>Total {token.name} minted</TableHeadCell>
			<TableHeadCell>{token.name} per locked {token.underlyingSymbol}</TableHeadCell>
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

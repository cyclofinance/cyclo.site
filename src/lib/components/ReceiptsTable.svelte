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

	export let token: CyToken;

	export let receipts: ReceiptType[];
	let selectedReceipt: ReceiptType | null = null;

	const mappedReceipts = receipts.map((receipt) => {
		// Guard against undefined values
		if (!receipt.balance || !receipt.tokenId) {
			console.log('Missing required values:', {
				balance: receipt.balance,
				tokenId: receipt.tokenId
			});
			return {
				...receipt,
				totalsFlr: BigInt(0),
				readableFlrPerReceipt: '0.00000',
				readableTotalsFlr: '0.00000'
			};
		}

		const balance = BigInt(receipt.balance);
		const tokenId = BigInt(receipt.tokenId);
		const totalsFlr = (balance * BigInt(10 ** 18)) / tokenId;
		const flrPerReceipt = BigInt(10 ** 36) / tokenId;

		return {
			...receipt,
			totalsFlr: totalsFlr,
			readableFlrPerReceipt: Number(formatEther(flrPerReceipt)).toFixed(5),
			readableTotalsFlr: Number(formatEther(totalsFlr)).toFixed(5)
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
						{Number(formatEther(receipt.balance)).toFixed(5)}
					</TableBodyCell>
					<TableBodyCell data-testid={`locked-price-${index}`}>
						{Number(formatEther(receipt.tokenId)).toFixed(5)}
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

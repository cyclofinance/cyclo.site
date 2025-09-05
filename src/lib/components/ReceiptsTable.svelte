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
	import { signerAddress, wagmiConfig, web3Modal } from 'svelte-wagmi';
	import { cusdxAddress, quoterAddress, selectedCyToken } from '$lib/stores';

	import ReceiptModal from '$lib/components/ReceiptModal.svelte';
	import Card from './Card.svelte';
	import { simulateQuoterQuoteExactInputSingle, simulateQuoterQuoteExactOutputSingle } from '../../generated';
	import { get } from 'svelte/store';

	export let token: CyToken;

	export let receipts: ReceiptType[];
	let selectedReceipt: ReceiptType | null = null;
	let mappedReceipts: any[] = [];

	// Function to calculate swap quote for a receipt
	async function calculateSwapQuote(receipt: ReceiptType) {
		try {
			console.log('$selectedCyToken.underlyingAddress : ', $selectedCyToken.underlyingAddress);
			console.log('$selectedCyToken.address : ', $selectedCyToken.address);
			console.log('$receipt.balance : ', receipt.balance);


			const { result: swapQuote } = await simulateQuoterQuoteExactInputSingle($wagmiConfig, {
				address: get(quoterAddress),
				args: [
					{
						tokenIn: $selectedCyToken.underlyingAddress,
						tokenOut: $selectedCyToken.address,
						amountIn: BigInt(100e18),
						fee: 3000,
						sqrtPriceLimitX96: BigInt(0)
					}
				]
			});
			console.log('swapQuote : ', swapQuote[0]);

			return Number(formatEther(swapQuote[0]));
		} catch (error) {
			console.error('Error calculating swap quote:', error);
			return null;
		}
	}

	// Function to process receipts with swap quotes
	async function processReceipts() {
		const processedReceipts = [];
		
		for (const receipt of receipts) {
			// Guard against undefined values
			if (!receipt.balance || !receipt.tokenId) {
				processedReceipts.push({
					...receipt,
					totalsFlr: BigInt(0),
					readableFlrPerReceipt: '0.00000',
					readableTotalsFlr: '0.00000',
					swapQuote: 0,
					readableSwapQuote: '0.00000',
					profitLoss: 0,
					readableProfitLoss: '0.00000'
				});
				continue;
			}

			const balance = BigInt(receipt.balance);
			const tokenId = BigInt(receipt.tokenId);
			const totalsFlr = (balance * BigInt(10 ** 18)) / tokenId;
			const flrPerReceipt = BigInt(10 ** 36) / tokenId;
			
			// Calculate swap quote
			const swapQuote = await calculateSwapQuote(receipt);
			const swapQuoteValue = swapQuote || 0;
			
			// Calculate P/L: totalsFlr - swapQuote
			const profitLoss = Number(formatEther(totalsFlr)) - swapQuoteValue;

			processedReceipts.push({
				...receipt,
				totalsFlr: totalsFlr,
				readableFlrPerReceipt: Number(formatEther(flrPerReceipt)).toFixed(5),
				readableTotalsFlr: Number(formatEther(totalsFlr)).toFixed(5),
				swapQuote: swapQuoteValue,
				readableSwapQuote: swapQuote ? swapQuoteValue.toFixed(5) : 'Error',
				profitLoss: profitLoss,
				readableProfitLoss: profitLoss.toFixed(5)
			});
		}
		
		mappedReceipts = processedReceipts;
	}

	$: console.log('mappedReceipts : ', (mappedReceipts));

	// Process receipts when receipts prop changes
	$: if (receipts.length > 0) {
		processReceipts();
	}
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
			<!-- <TableHeadCell>Swap Quote ({token.underlyingSymbol})</TableHeadCell> -->
			<TableHeadCell>P/L ({token.underlyingSymbol})</TableHeadCell>
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
					<!-- <TableBodyCell data-testid={`swap-quote-${index}`}>
						{receipt.readableSwapQuote}
					</TableBodyCell> -->
					<TableBodyCell 
						data-testid={`profit-loss-${index}`}
						class={receipt.profitLoss > 0 ? 'text-green-400' : receipt.profitLoss < 0 ? 'text-red-400' : ''}
					>
						{receipt.profitLoss > 0 ? '+' : ''}{receipt.readableProfitLoss}
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

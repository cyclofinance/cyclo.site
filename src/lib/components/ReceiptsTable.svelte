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
	import { formatEther, parseEther } from 'ethers';
	import { wagmiConfig } from 'svelte-wagmi';
	import { quoterAddress, selectedCyToken, } from '$lib/stores';

	import ReceiptModal from '$lib/components/ReceiptModal.svelte';
	import Card from './Card.svelte';
	import {
		simulateQuoterQuoteExactInputSingle,
		simulateQuoterQuoteExactOutputSingle
	} from '../../generated';
	import { get } from 'svelte/store';
	import type { DataFetcher } from 'sushi';
	import { useDataFetcher } from '$lib/dataFetcher';
	import { getAmountOut, getPrice } from '$lib/trade/prices';
	import { Token } from 'sushi/currency';
	import { flare } from '@wagmi/core/chains';

	export let token: CyToken;

	export let receipts: ReceiptType[];
	let selectedReceipt: ReceiptType | null = null;
	let mappedReceipts: ReceiptType[] = [];
	let isLoading = false;
	
	// Initialize dataFetcher at component level
	const dataFetcher: DataFetcher = useDataFetcher();

	async function calculateSwapQuote(receipt: ReceiptType) {
		try {
			const swapQuote = await getAmountOut(
				{
					address: $selectedCyToken.address,
					decimals: $selectedCyToken.decimals,
					name: $selectedCyToken.name || 'Unknown',
					symbol: $selectedCyToken.symbol || 'UNK'
				},
				{
					address: $selectedCyToken.underlyingAddress,
					decimals: $selectedCyToken.decimals,
					name: 'UNKONW',
					symbol: $selectedCyToken.underlyingSymbol || 'UNK'
				},
				receipt.balance,
				dataFetcher
			);

			return swapQuote;
		} catch (error) {
			console.error('Error calculating swap quote:', error);
			return null;
		}
	}

	// Function to process receipts with swap quotes
	async function processReceipts() {
		isLoading = true;
		const processReceipt = async (receipt: ReceiptType): Promise<ReceiptType> => {
			// Guard against undefined values
			if (!receipt.balance || !receipt.tokenId) {
				return {
					...receipt,
					totalsFlr: BigInt(0),
					readableFlrPerReceipt: '0.00000',
					readableTotalsFlr: '0.00000',
					swapQuote: 0n,
					readableSwapQuote: '0.00000',
					profitLoss: 0n,
					readableProfitLoss: '0.00000'
				};
			}

			const balance = BigInt(receipt.balance);
			const tokenId = BigInt(receipt.tokenId);
			const totalsFlr = (balance * BigInt(10 ** 18)) / tokenId;
			const flrPerReceipt = BigInt(10 ** 36) / tokenId;

			// Calculate swap quote
			const swapQuote = await calculateSwapQuote(receipt);
			const swapQuoteValue = swapQuote && !isNaN(Number(swapQuote)) 
				? BigInt(Math.floor(Number(swapQuote) * 10 ** $selectedCyToken.decimals)) 
				: 0n;

			// Calculate P/L: totalsFlr - swapQuote
			const profitLoss = totalsFlr - swapQuoteValue;

			return {
				...receipt,
				totalsFlr: totalsFlr,
				readableFlrPerReceipt: Number(formatEther(flrPerReceipt)).toFixed(5),
				readableTotalsFlr: Number(formatEther(totalsFlr)).toFixed(5),
				swapQuote: swapQuoteValue,
				readableSwapQuote: swapQuote ? Number(formatEther(swapQuoteValue)).toFixed(5) : 'Error',
				profitLoss: profitLoss,
				readableProfitLoss: Number(formatEther(profitLoss)).toFixed(5)
			};
		};

		// Process all receipts in parallel
		const processedReceipts = await Promise.all(receipts.map(processReceipt));
		mappedReceipts = processedReceipts;
		isLoading = false;
	}

	// Process receipts when receipts prop changes
	$: if (receipts.length > 0) {
		processReceipts();
	}
</script>

<Card size="lg">
	<!-- Desktop Table View -->
	<div class="hidden md:block">
		<Table divClass="w-full" data-testid="receipts-table">
			<TableHead
				class="bg-opacity-0 bg-none p-1 text-white md:p-4 [&_th]:px-2 [&_th]:md:px-6"
				data-testid="headers"
			>
				<TableHeadCell>Total {token.underlyingSymbol} Locked</TableHeadCell>
				<TableHeadCell>Total {token.name} minted</TableHeadCell>
				<TableHeadCell>{token.name} per locked {token.underlyingSymbol}</TableHeadCell>
				<TableHeadCell>P/L ({token.underlyingSymbol})</TableHeadCell>
			</TableHead>
			<TableBody
				tableBodyClass="bg-opacity-0 [&_td]:text-white p-1 [&_td]:text-left [&_td]:px-2 [&_td]:md:px-6"
			>
				{#if isLoading}
					<TableBodyRow class="bg-opacity-0">
						<TableBodyCell colspan="5" class="text-center py-8">
							<div class="flex items-center justify-center">
								<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
								<span class="ml-2 text-white">Loading receipts...</span>
							</div>
						</TableBodyCell>
					</TableBodyRow>
				{:else}
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
							<TableBodyCell
								data-testid={`profit-loss-${index}`}
								class={receipt.profitLoss && receipt.profitLoss > 0
									? 'text-green-400'
									: receipt.profitLoss && receipt.profitLoss < 0
										? 'text-red-400'
										: ''}
							>
								{receipt.profitLoss && receipt.profitLoss > 0
									? '+'
									: receipt.profitLoss && receipt.profitLoss < 0
										? '-'
										: ''}{receipt.readableProfitLoss}
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
				{/if}
			</TableBody>
		</Table>
	</div>

	<!-- Mobile Card View -->
	<div class="space-y-3 md:hidden">
		{#if isLoading}
			<div class="rounded-lg border-2 border-white bg-opacity-0 p-4 text-white text-center">
				<div class="flex items-center justify-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
					<span class="ml-2">Loading receipts...</span>
				</div>
			</div>
		{:else}
			{#each mappedReceipts as receipt, index}
			<div
				class="rounded-lg border-2 border-white bg-opacity-0 p-4 text-white"
				data-testid={`receipt-card-${index}`}
			>
				<!-- Header with P/L indicator -->
				<div class="mb-3 flex items-start justify-between">
					<div class="text-sm font-medium text-gray-300">
						Position #{index + 1}
					</div>
					<div
						class="text-sm font-bold"
						class:text-green-400={receipt.profitLoss && receipt.profitLoss > 0}
						class:text-red-400={receipt.profitLoss && receipt.profitLoss < 0}
						data-testid={`profit-loss-${index}`}
					>
						{receipt.profitLoss && receipt.profitLoss > 0
							? '+'
							: receipt.profitLoss && receipt.profitLoss < 0
								? '-'
								: ''}{receipt.readableProfitLoss}
						{token.underlyingSymbol}
					</div>
				</div>

				<!-- Data rows -->
				<div class="mb-4 space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300">Total {token.underlyingSymbol} Locked:</span>
						<span class="text-sm font-medium" data-testid={`total-locked-${index}`}>
							{receipt.readableTotalsFlr}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300">Total {token.name} minted:</span>
						<span class="text-sm font-medium" data-testid={`number-held-${index}`}>
							{Number(formatEther(receipt.balance)).toFixed(5)}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300"
							>{token.name} per locked {token.underlyingSymbol}:</span
						>
						<span class="text-sm font-medium" data-testid={`locked-price-${index}`}>
							{Number(formatEther(receipt.tokenId)).toFixed(5)}
						</span>
					</div>
				</div>

				<!-- Unlock button -->
				<Button
					class="flex w-full items-center justify-center rounded-none border-2 border-white bg-primary py-2 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-neutral-600"
					data-testid={`redeem-button-${index}`}
					on:click={() => (selectedReceipt = receipt)}
				>
					Unlock
				</Button>
			</div>
			{/each}
		{/if}
	</div>
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

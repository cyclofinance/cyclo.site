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
	import { wagmiConfig } from 'svelte-wagmi';
	import { quoterAddress, selectedCyToken } from '$lib/stores';

	import ReceiptModal from '$lib/components/ReceiptModal.svelte';
	import Card from './Card.svelte';
	import {
		simulateQuoterQuoteExactInputSingle,
		simulateQuoterQuoteExactOutputSingle
	} from '../../generated';
	import { get } from 'svelte/store';

	export let token: CyToken;

	export let receipts: ReceiptType[];
	let selectedReceipt: ReceiptType | null = null;
	let mappedReceipts: ReceiptType[] = [];

	// Function to calculate swap quote for a receipt
	async function calculateSwapQuote(receipt: ReceiptType) {
		try {
			const isCyWETH =
				$selectedCyToken.symbol?.toLowerCase().includes('weth') ||
				$selectedCyToken.name?.toLowerCase().includes('weth');
			const feeTiers = isCyWETH ? [10000, 3000, 500] : [3000, 500, 10000];
			let lastError = null;

			for (const fee of feeTiers) {
				try {
					const { result: swapQuote } = await simulateQuoterQuoteExactOutputSingle($wagmiConfig, {
						address: get(quoterAddress),
						args: [
							{
								tokenIn: $selectedCyToken.underlyingAddress,
								tokenOut: $selectedCyToken.address,
								amount: BigInt(receipt.balance),
								fee: fee,
								sqrtPriceLimitX96: BigInt(0)
							}
						]
					});
					return swapQuote[0];
				} catch (feeError) {
					lastError = feeError;
					continue;
				}
			}

			for (const fee of feeTiers) {
				try {
					const { result: swapQuote } = await simulateQuoterQuoteExactInputSingle($wagmiConfig, {
						address: get(quoterAddress),
						args: [
							{
								tokenIn: $selectedCyToken.address,
								tokenOut: $selectedCyToken.underlyingAddress,
								amountIn: BigInt(receipt.balance),
								fee: fee,
								sqrtPriceLimitX96: BigInt(0)
							}
						]
					});

					return swapQuote[0];
				} catch (reverseError) {
					lastError = reverseError;
					continue;
				}
			}

			throw lastError || new Error('All swap attempts failed');
		} catch (error) {
			console.error('Error calculating swap quote:', error);
			return null;
		}
	}

	// Function to process receipts with swap quotes
	async function processReceipts() {
		const processedReceipts: ReceiptType[] = [];

		for (const receipt of receipts) {
			// Guard against undefined values
			if (!receipt.balance || !receipt.tokenId) {
				processedReceipts.push({
					...receipt,
					totalsFlr: BigInt(0),
					readableFlrPerReceipt: '0.00000',
					readableTotalsFlr: '0.00000',
					swapQuote: 0n,
					readableSwapQuote: '0.00000',
					profitLoss: 0n,
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
			const swapQuoteValue = swapQuote || 0n;

			// Calculate P/L: totalsFlr - swapQuote
			const profitLoss = totalsFlr - swapQuoteValue;

			processedReceipts.push({
				...receipt,
				totalsFlr: totalsFlr,
				readableFlrPerReceipt: Number(formatEther(flrPerReceipt)).toFixed(5),
				readableTotalsFlr: Number(formatEther(totalsFlr)).toFixed(5),
				swapQuote: swapQuoteValue,
				readableSwapQuote: swapQuote ? Number(formatEther(swapQuoteValue)).toFixed(5) : 'Error',
				profitLoss: profitLoss,
				readableProfitLoss: Number(formatEther(profitLoss)).toFixed(5)
			});
		}

		mappedReceipts = processedReceipts;
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
			</TableBody>
		</Table>
	</div>

	<!-- Mobile Card View -->
	<div class="space-y-3 md:hidden">
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

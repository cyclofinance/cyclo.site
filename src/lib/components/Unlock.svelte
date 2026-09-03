<script lang="ts">
	import { signerAddress, web3Modal, wagmiConfig } from 'svelte-wagmi';
	import Card from '$lib/components/Card.svelte';
	import { refreshReceiptsForToken } from '$lib/queries/refreshReceiptsForToken';
	import { getReceiptLockDates, type LockDateMap } from '$lib/queries/getReceiptLockDates';
	import { getUnderlyingUsdPrice, getCyTokenUsdPrice } from '$lib/queries/getPositionPrices';
	import { formatUnits } from 'ethers';
	import ReceiptsTable from '$lib/components/ReceiptsTable.svelte';
	import Button from '$lib/components/Button.svelte';
	import balancesStore from '$lib/balancesStore';
	import { fade } from 'svelte/transition';
	import {
		selectedCyToken,
		allTokens,
		selectedNetwork,
		setActiveNetworkByChainId,
		myReceipts
	} from '$lib/stores';
	import Select from '$lib/components/Select.svelte';
	import { switchNetwork } from '@wagmi/core';

	let loading = true;
	let progressMessage = '';

	// Position detail: lock dates from the explorer, prices from the vault oracle
	// and the DEX. All best-effort — the receipts table renders without them.
	let receiptsError: string | null = null;
	let lockDates: LockDateMap = new Map();
	let underlyingUsdNow: bigint | null = null;
	let cyTokenUsdNow: bigint | null = null;

	const setLoading = (_loading: boolean) => {
		loading = _loading;
		if (_loading) progressMessage = '';
	};

	// Guards
	let previousSignerAddress: string | null = null;
	let previousNetworkKey: string | undefined = undefined;
	let previousSelectedTokenName: string | undefined = undefined;

	let isRefreshing = false;
	let isHandlingTokenChange = false;
	let lastUserSelectedTokenAddress: string | undefined = undefined;

	// Abort controller to cancel in-flight fetch when user changes selection quickly
	let receiptsAbortController: AbortController | null = null;

	function cancelInFlightReceiptsFetch() {
		if (receiptsAbortController) {
			receiptsAbortController.abort();
			receiptsAbortController = null;
		}
	}

	// Auto-switch network when user selects a token on another chain
	$: if (
		$selectedCyToken?.address &&
		$selectedNetwork?.chain?.id &&
		!isHandlingTokenChange &&
		$selectedCyToken.address !== lastUserSelectedTokenAddress &&
		$selectedNetwork.chain.id !== $selectedCyToken.chainId
	) {
		isHandlingTokenChange = true;

		const targetChainId = $selectedCyToken.chainId;
		lastUserSelectedTokenAddress = $selectedCyToken.address;

		// Update app network first (store-level)
		setActiveNetworkByChainId(targetChainId);

		// Try to switch wallet network if connected
		if ($signerAddress && $wagmiConfig) {
			switchNetwork($wagmiConfig, { chainId: targetChainId })
				.catch((error) => {
					console.warn(`Failed to switch wallet network to ${targetChainId}:`, error);
				})
				.finally(() => {
					// Let stores settle
					setTimeout(() => {
						isHandlingTokenChange = false;
					}, 500);
				});
		} else {
			setTimeout(() => {
				isHandlingTokenChange = false;
			}, 300);
		}
	}

	/**
	 * Fetch receipts ONLY for the currently selected token.
	 * Triggers when:
	 * - signer changes
	 * - network changes
	 * - selected token changes
	 */
	$: if (
		$signerAddress &&
		$selectedNetwork?.rewardsSubgraphUrl &&
		$selectedCyToken?.name &&
		!isRefreshing
	) {
		const signerChanged = $signerAddress !== previousSignerAddress;
		const networkChanged = $selectedNetwork.key !== previousNetworkKey;
		const tokenChanged = $selectedCyToken.name !== previousSelectedTokenName;

		if (signerChanged || networkChanged || tokenChanged) {
			isRefreshing = true;
			setLoading(true);

			previousSignerAddress = $signerAddress;
			previousNetworkKey = $selectedNetwork.key;
			previousSelectedTokenName = $selectedCyToken.name;

			// Cancel previous request (very important to avoid runaway / "Aw snap")
			cancelInFlightReceiptsFetch();
			receiptsAbortController = new AbortController();

			// (Optional) small UX message
			progressMessage = `Fetching ${$selectedCyToken.name} receipts...`;

			const wallet = $signerAddress;
			const cyToken = $selectedCyToken;
			const networkConfig = $selectedNetwork;
			const signal = receiptsAbortController.signal;

			// Reset so a stale token's numbers never render against a new token.
			receiptsError = null;
			lockDates = new Map();
			underlyingUsdNow = null;
			cyTokenUsdNow = null;

			refreshReceiptsForToken($signerAddress, $selectedCyToken.name, setLoading, {
				signal: receiptsAbortController.signal
			})
				.then((receipts) => {
					if (signal.aborted || !receipts.length) return;
					// Fire and forget: the table is already usable without these.
					getReceiptLockDates(wallet, cyToken.receiptAddress, networkConfig, { signal })
						.then((dates) => {
							if (!signal.aborted) lockDates = dates;
						})
						.catch((e) => console.error('lock dates failed:', e));

					getUnderlyingUsdPrice(cyToken)
						.then((price) => {
							if (!signal.aborted) underlyingUsdNow = price;
						})
						.catch((e) => console.error('underlying price failed:', e));

					getCyTokenUsdPrice(cyToken)
						.then((price) => {
							if (!signal.aborted) cyTokenUsdNow = price;
						})
						.catch((e) => console.error('cyToken price failed:', e));
				})
				.catch((e) => {
					// Abort should be silent
					if (e instanceof DOMException && e.name === 'AbortError') return;
					console.error('refreshReceiptsForToken failed:', e);
					receiptsError = e instanceof Error ? e.message : String(e);
				})
				.finally(() => {
					isRefreshing = false;
				});
		}
	}

	// If wallet disconnects, cleanup
	$: if (!$signerAddress) {
		cancelInFlightReceiptsFetch();
		loading = false;
		progressMessage = '';
	}
</script>

{#if !$signerAddress}
	<Button on:click={() => $web3Modal.open()} class="w-fit text-lg md:text-xl">
		CONNECT WALLET TO VIEW RECEIPTS
	</Button>
{:else}
	<div class="flex w-full max-w-5xl flex-col items-stretch gap-6" data-testid="unlock-column">
	<Card size="lg" customClass="!max-w-none w-full">
		<div
			class="flex w-full flex-col justify-between font-semibold text-white sm:flex-row sm:text-xl md:text-xl"
		>
			<div class="flex flex-col">
				<span>WALLET BALANCE</span>
				<span class="text-xs font-normal text-gray-400">cyToken balance in your wallet. Locked positions are listed below.</span>
			</div>
			<div class="flex flex-col gap-4 sm:items-end">
				{#each $allTokens.filter((t) => t.name === $selectedCyToken?.name) as token}
					<div class="flex flex-row gap-2" data-testid="{token.symbol.toLowerCase()}-balance">
						{#key $balancesStore.balances[token.name]?.signerBalance}
							<span in:fade={{ duration: 700 }}>
								{formatUnits(
									$balancesStore.balances[token.name]?.signerBalance || 0n,
									token.decimals
								)}
							</span>
						{/key}
						<span>{token.symbol}</span>
					</div>
				{/each}
			</div>
		</div>
	</Card>
	<Card size="lg" customClass="!max-w-none w-full">
		<div
			class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
		>
			<span>SELECT TOKEN</span>
			<Select
				options={$allTokens}
				bind:selected={$selectedCyToken}
				getOptionLabel={(option) => `${option.symbol} · ${option.networkName}`}
			/>
		</div>
	</Card>

	{#if loading}
		<div
			class="flex w-full flex-col items-center justify-center text-center text-lg font-semibold text-white md:text-xl"
		>
			<div>LOADING...</div>
			{#if progressMessage}
				<div class="mt-2 text-sm text-gray-300">{progressMessage}</div>
			{/if}
		</div>
	{:else if $myReceipts.length > 0}
		<!-- NOTE: $myReceipts now contains ONLY selected token receipts -->
		<ReceiptsTable
			token={$selectedCyToken}
			receipts={$myReceipts}
			{lockDates}
			{underlyingUsdNow}
			{cyTokenUsdNow}
		/>
	{:else if receiptsError}
		<div
			class="flex w-full flex-col items-center justify-center gap-1 text-center text-lg font-semibold text-red-400 md:text-xl"
			data-testid="receipts-error"
		>
			<div>COULD NOT LOAD {$selectedCyToken.name} RECEIPTS</div>
			<div class="text-sm font-normal text-gray-300">{receiptsError}</div>
		</div>
	{:else}
		<div
			class="flex w-full items-center justify-center text-center text-lg font-semibold text-white md:text-xl"
		>
			NO {$selectedCyToken.name} RECEIPTS FOUND...
		</div>
	{/if}
	</div>
{/if}

<script lang="ts">
	import { signerAddress, web3Modal, wagmiConfig } from 'svelte-wagmi';
	import Card from '$lib/components/Card.svelte';
	import { refreshReceiptsForToken } from '$lib/queries/refreshReceiptsForToken';
	import { formatUnits } from 'ethers';
	import ReceiptsTable from '$lib/components/ReceiptsTable.svelte';
	import Button from '$lib/components/Button.svelte';
	import balancesStore from '$lib/balancesStore';
	import { fade } from 'svelte/transition';
	import { selectedCyToken, allTokens, selectedNetwork, setActiveNetworkByChainId, myReceipts } from '$lib/stores';
	import Select from '$lib/components/Select.svelte';
	import { switchNetwork } from '@wagmi/core';

	let loading = true;
	let progressMessage = '';

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

			refreshReceiptsForToken($signerAddress, $selectedCyToken.name, setLoading, {
				signal: receiptsAbortController.signal
			})
				.catch((e) => {
					// Abort should be silent
					if (e instanceof DOMException && e.name === 'AbortError') return;
					console.error('refreshReceiptsForToken failed:', e);
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
	<Card size="lg">
		<div class="flex w-full flex-col justify-between font-semibold text-white sm:flex-row sm:text-xl md:text-xl">
			<span>BALANCES</span>
			<div class="flex flex-col gap-4 sm:items-end">
				{#each $allTokens as token}
					<div class="flex flex-row gap-2" data-testid="{token.symbol.toLowerCase()}-balance">
						{#key $balancesStore.balances[token.name]?.signerBalance}
							<span in:fade={{ duration: 700 }}>
								{formatUnits($balancesStore.balances[token.name]?.signerBalance || 0n, token.decimals)}
							</span>
						{/key}
						<span>{token.symbol}</span>
					</div>
				{/each}
			</div>
		</div>
	</Card>
	<Card size="lg">
		<div class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl">
			<span>SELECT TOKEN</span>
			<Select
				options={$allTokens}
				bind:selected={$selectedCyToken}
				getOptionLabel={(option) => `${option.symbol} · ${option.networkName}`}
			/>
		</div>
	</Card>

	{#if loading}
		<div class="flex w-full flex-col items-center justify-center text-center text-lg font-semibold text-white md:text-xl">
			<div>LOADING...</div>
			{#if progressMessage}
				<div class="mt-2 text-sm text-gray-300">{progressMessage}</div>
			{/if}
		</div>
	{:else if $myReceipts.length > 0}
		<!-- NOTE: $myReceipts now contains ONLY selected token receipts -->
		<ReceiptsTable token={$selectedCyToken} receipts={$myReceipts} />
	{:else}
		<div class="flex w-full items-center justify-center text-center text-lg font-semibold text-white md:text-xl">
			NO {$selectedCyToken.name} RECEIPTS FOUND...
		</div>
	{/if}
{/if}

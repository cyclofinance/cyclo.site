<script lang="ts">
	import {
		allTokens,
		selectedCyToken,
		selectedNetwork,
		getDexScreenerChainName,
		supportedNetworks,
		setActiveNetworkByChainId
	} from '$lib/stores';
	import Select from '$lib/components/Select.svelte';
	import { onMount } from 'svelte';
	import { flare, arbitrum } from '@wagmi/core/chains';
	import type { Chain } from '@wagmi/core/chains';
	import { switchNetwork } from '@wagmi/core';
	import { wagmiConfig } from 'svelte-wagmi';

	// Chart configurations per network
	// Note: Chart addresses may differ per network - update with actual pool addresses when available.
	// If a token isn't listed here, we fall back to using the cyToken address directly.
	const chartConfigs: Record<string, Record<string, { address: string; name: string }>> = {
		flare: {
			cysFLR: {
				address: '0x05cf1df11d92d99988c9b797e91d95e60bba1720',
				name: 'cysFLR/USDC.e'
			},
			cyWETH: {
				address: '0x650a36213419fc19892b375595960180e272e16b',
				name: 'cyWETH/USDC.e'
			}
		},
		arbitrum: {}
	};

	// DexScreener chain slug overrides (more reliable than name normalization)
	const dexSlugByChainId: Record<number, string> = {
		[flare.id]: 'flare',
		[arbitrum.id]: 'arbitrum'
	};

	const getDexSlug = (chain: Chain) => dexSlugByChainId[chain.id] || getDexScreenerChainName(chain);

	let chartUrl = '';
	let isLoading = false;

	function updateChart() {
		// Use the network that matches the selected token's chainId; fall back to current selected network
		const networkForToken =
			supportedNetworks.find((n) => n.chain.id === $selectedCyToken.chainId) || $selectedNetwork;

		// Switch app network to match the token
		if (networkForToken.chain.id !== $selectedNetwork.chain.id) {
			setActiveNetworkByChainId(networkForToken.chain.id);
		}
		// Attempt wallet switch if config is available
		const walletConfig = $wagmiConfig;
		if (walletConfig) {
			switchNetwork(walletConfig, { chainId: networkForToken.chain.id }).catch((error) =>
				console.warn(`Failed to switch wallet network to ${networkForToken.chain.id}:`, error)
			);
		}

		const dexScreenerChain = getDexSlug(networkForToken.chain);
		const networkConfigs = chartConfigs[dexScreenerChain] || {};
		// Use explicit config if present; otherwise fallback to token's own address
		const chartConfig = networkConfigs[$selectedCyToken.symbol as keyof typeof networkConfigs] || {
			address: $selectedCyToken.address,
			name: $selectedCyToken.symbol
		};

		if (chartConfig && chartConfig.address) {
			isLoading = true;
			// Ensure address is lowercase (DexScreener expects lowercase addresses)
			const address = chartConfig.address.toLowerCase();
			chartUrl = `https://dexscreener.com/${dexScreenerChain}/${address}?embed=1&theme=dark&chartTheme=dark&chartType=usd&interval=1d&chartLeftToolbar=1&chartRightToolbar=1`;
			console.log('Chart URL generated:', {
				chainId: networkForToken.chain.id,
				chainName: networkForToken.chain.name,
				dexScreenerChain,
				tokenSymbol: $selectedCyToken.symbol,
				address: chartConfig.address,
				lowercaseAddress: address,
				chartUrl
			});
		} else {
			console.warn('Chart config not found for:', {
				chainId: networkForToken.chain.id,
				chainName: networkForToken.chain.name,
				dexScreenerChain,
				tokenSymbol: $selectedCyToken.symbol,
				availableConfigs: Object.keys(networkConfigs)
			});
			chartUrl = '';
		}
	}

	function handleChartLoad() {
		isLoading = false;
	}

	// Update chart when token selection or network changes
	$: if ($selectedCyToken && $selectedNetwork) {
		updateChart();
	}

	onMount(() => {
		updateChart();
	});
</script>

<div class="flex w-full flex-col items-center justify-center gap-4 p-4 sm:gap-6 sm:p-6">
	<div
		class="flex w-full flex-col items-center gap-3 text-base font-semibold text-white sm:flex-row sm:justify-center sm:gap-6 sm:text-xl"
	>
		<span>CHART</span>
		{#if $allTokens.length > 0}
			<Select
				options={$allTokens}
				bind:selected={$selectedCyToken}
				getOptionLabel={(option) => option.name}
				dataTestId="chart-token-select"
			/>
		{/if}
	</div>

	{#if chartUrl}
		<div id="dexscreener-embed" class="relative w-full">
			{#if isLoading}
				<div
					class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-gray-900/80"
				>
					<div class="flex flex-col items-center gap-3 sm:gap-4">
						<div
							class="h-8 w-8 animate-spin rounded-full border-b-2 border-white sm:h-12 sm:w-12"
						></div>
						<span class="text-sm font-semibold text-white sm:text-lg">Loading...</span>
					</div>
				</div>
			{/if}
			<iframe
				title="chart"
				class="h-[60vh] w-full rounded-lg sm:h-[70vh] lg:h-[80vh]"
				src={chartUrl}
				allowfullscreen
				on:load={handleChartLoad}
			></iframe>
		</div>
	{/if}
</div>

<style>
	#dexscreener-embed {
		position: relative;
		width: 100%;
	}
</style>

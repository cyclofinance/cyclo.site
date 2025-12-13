<script lang="ts">
	import { tokens, selectedCyToken, selectedNetwork, getDexScreenerChainName } from '$lib/stores';
	import Select from '$lib/components/Select.svelte';
	import { onMount } from 'svelte';

	// Chart configurations per network
	// Note: Chart addresses may differ per network - update with actual addresses when available
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
		}
	};

	let chartUrl = '';
	let isLoading = false;

	function updateChart() {
		const network = $selectedNetwork;
		const dexScreenerChain = getDexScreenerChainName(network.chain);
		const networkConfigs = chartConfigs[dexScreenerChain] || chartConfigs.flare; // Fallback to flare if network not found
		const config = networkConfigs[$selectedCyToken.symbol as keyof typeof networkConfigs];

		if (config && config.address) {
			isLoading = true;
			// Ensure address is lowercase (DexScreener expects lowercase addresses)
			const address = config.address.toLowerCase();
			chartUrl = `https://dexscreener.com/${dexScreenerChain}/${address}?embed=1&theme=dark&chartTheme=dark&chartType=usd&interval=1d&chartLeftToolbar=1&chartRightToolbar=1`;
			console.log('Chart URL generated:', {
				chainId: network.chain.id,
				chainName: network.chain.name,
				dexScreenerChain,
				tokenSymbol: $selectedCyToken.symbol,
				address: config.address,
				lowercaseAddress: address,
				chartUrl
			});
		} else {
			console.warn('Chart config not found for:', {
				chainId: network.chain.id,
				chainName: network.chain.name,
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
		{#if $tokens.length > 0}
			<Select
				options={$tokens}
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

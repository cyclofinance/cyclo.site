<script lang="ts">
	import '../app.css';
	import { defaultConfig, signerAddress, wagmiConfig, chainId } from 'svelte-wagmi';
	import { injected, walletConnect } from '@wagmi/connectors';
	import Header from '$lib/components/Header.svelte';
	import { PUBLIC_WALLETCONNECT_ID } from '$env/static/public';
	import { browser } from '$app/environment';
	import { PUBLIC_LAUNCHED } from '$env/static/public';
	import { setActiveNetworkByChainId, supportedNetworks } from '$lib/stores';
	import { cusdxAddress, quoterAddress, selectedCyToken } from '$lib/stores';
	import balancesStore from '$lib/balancesStore';
	import blockNumberStore from '$lib/blockNumberStore';
	import { onDestroy } from 'svelte';
	import type { Hex } from 'viem';
	import DataFetcherProvider from '$lib/components/DataFetcherProvider.svelte';

	let intervalId: ReturnType<typeof setInterval>;
	let lastChainId: number | null = null;
	const isBrowser = typeof window !== 'undefined';
	const initWallet = async () => {
		// Get all chains from supported networks
		const chains = supportedNetworks.map((network) => network.chain);
		const erckit = defaultConfig({
			autoConnect: true,
			appName: 'cyclo',
			walletConnectProjectId: PUBLIC_WALLETCONNECT_ID,
			chains: chains,
			connectors: [injected(), walletConnect({ projectId: PUBLIC_WALLETCONNECT_ID })]
		});
		await erckit.init();
		startGettingPricesAndBalances();
	};

	const getPricesAndBalances = () => {
		blockNumberStore.refresh($wagmiConfig);
		balancesStore.refreshPrices($wagmiConfig, $selectedCyToken);
		balancesStore.refreshFooterStats($wagmiConfig, $quoterAddress, $cusdxAddress);
		if ($signerAddress) {
			balancesStore.refreshBalances($wagmiConfig, $signerAddress as Hex);
		}
	};

	$: if (browser && window.navigator) {
		initWallet();
	}

	$: if (isBrowser) {
		if ($chainId && $chainId !== lastChainId) {
			lastChainId = $chainId;
			setActiveNetworkByChainId($chainId);
		} else if (!$chainId && lastChainId !== null) {
			lastChainId = null;
		}
	}

	const startGettingPricesAndBalances = () => {
		intervalId = setInterval(getPricesAndBalances, 3000);
	};

	function stopGettingPriceRatio() {
		clearInterval(intervalId);
	}

	onDestroy(() => {
		stopGettingPriceRatio();
	});
</script>

{#if $wagmiConfig}
	<DataFetcherProvider>
		<div class="flex min-h-screen flex-col">
			<Header launched={PUBLIC_LAUNCHED === 'true'} />
			<main class="flex-grow bg-[#1C02B8]">
				<slot />
			</main>
		</div>
	</DataFetcherProvider>
{/if}

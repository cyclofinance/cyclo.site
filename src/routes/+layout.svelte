<script lang="ts">
	import '../app.css';
	import { defaultConfig, signerAddress, wagmiConfig, chainId } from 'svelte-wagmi';
	import { injected, walletConnect } from '@wagmi/connectors';
	import Header from '$lib/components/Header.svelte';
	import { PUBLIC_WALLETCONNECT_ID } from '$env/static/public';
	import { browser } from '$app/environment';
	import { PUBLIC_LAUNCHED } from '$env/static/public';
	import { setActiveNetworkByChainId, supportedNetworks } from '$lib/stores';
	import { env } from '$env/dynamic/public';
	import { initWallet as initInjectedOnly } from '$lib/wallet';
	import { selectedCyToken } from '$lib/stores';
	import balancesStore from '$lib/balancesStore';
	import blockNumberStore from '$lib/blockNumberStore';
	import { onDestroy } from 'svelte';
	import type { Hex } from 'viem';
	import DataFetcherProvider from '$lib/components/DataFetcherProvider.svelte';

	let intervalId: ReturnType<typeof setInterval>;
	let lastChainId: number | null = null;
	const isBrowser = typeof window !== 'undefined';
	// Build-time look: PUBLIC_THEME=apex is a private theme; default is Cyclo's own.
	if (typeof document !== 'undefined') {
		document.documentElement.dataset.theme = env.PUBLIC_THEME || 'cyclo';
		if (env.PUBLIC_THEME === 'apex') document.title = 'Cyclo positions';
	}

	const initWallet = async () => {
		// PUBLIC_WALLET=injected: browser-extension wallet only, no WalletConnect
		// relay (private single-user build). Default keeps Cyclo's full setup.
		if (env.PUBLIC_WALLET === 'injected') {
			await initInjectedOnly();
			startGettingPricesAndBalances();
			return;
		}
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
		balancesStore.refreshFooterStats($wagmiConfig);
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
		intervalId = setInterval(getPricesAndBalances, 10000);
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
			<Header
				launched={PUBLIC_LAUNCHED === 'true'}
				managerOnly={env.PUBLIC_MANAGER_HOME === 'true'}
			/>
			<main class="flex-grow bg-page">
				<slot />
			</main>
		</div>
	</DataFetcherProvider>
{/if}

<script lang="ts">
	import '../app.css';
	import { signerAddress, wagmiConfig, chainId } from 'svelte-wagmi';
	import Header from '$lib/components/Header.svelte';
	import { browser } from '$app/environment';
	import { PUBLIC_LAUNCHED } from '$env/static/public';
	import { setActiveNetworkByChainId } from '$lib/stores';
	import { initWallet as bootWallet } from '$lib/wallet';
	import { selectedCyToken } from '$lib/stores';
	import balancesStore from '$lib/balancesStore';
	import blockNumberStore from '$lib/blockNumberStore';
	import { onDestroy } from 'svelte';
	import type { Hex } from 'viem';
	import DataFetcherProvider from '$lib/components/DataFetcherProvider.svelte';

	let intervalId: ReturnType<typeof setInterval>;
	let lastChainId: number | null = null;
	const isBrowser = typeof window !== 'undefined';
	// Browser-extension wallet only (Trezor via Rabby). No Reown modal, no
	// WalletConnect relay -- see src/lib/wallet.ts.
	const initWallet = async () => {
		await bootWallet();
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
			<Header launched={PUBLIC_LAUNCHED === 'true'} />
			<main class="flex-grow bg-[#1C02B8]">
				<slot />
			</main>
		</div>
	</DataFetcherProvider>
{/if}

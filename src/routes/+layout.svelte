<script lang="ts">
	import '../app.css';
	import { defaultConfig, signerAddress, wagmiConfig } from 'svelte-wagmi';
	import { injected, walletConnect } from '@wagmi/connectors';
	import Header from '$lib/components/Header.svelte';
	import { PUBLIC_WALLETCONNECT_ID } from '$env/static/public';
	import { browser } from '$app/environment';
	import { PUBLIC_LAUNCHED } from '$env/static/public';
	import { flare } from '@wagmi/core/chains';
	import { cusdxAddress, quoterAddress, selectedCyToken } from '$lib/stores';
	import balancesStore from '$lib/balancesStore';
	import blockNumberStore from '$lib/blockNumberStore';
	import { onDestroy, onMount } from 'svelte';
	import type { Hex } from 'viem';

	let intervalId: ReturnType<typeof setInterval>;
	const initWallet = async () => {
		const erckit = defaultConfig({
			autoConnect: true,
			appName: 'cyclo',
			walletConnectProjectId: PUBLIC_WALLETCONNECT_ID,
			chains: [flare],
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

	$: if ($selectedCyToken && $signerAddress) {
		balancesStore.refreshBalances($wagmiConfig, $signerAddress as Hex);
	}

	const startGettingPricesAndBalances = () => {
		blockNumberStore.refresh($wagmiConfig);
		balancesStore.refreshPrices($wagmiConfig, $selectedCyToken);
		intervalId = setInterval(getPricesAndBalances, 3000);
	};

	function stopGettingPriceRatio() {
		clearInterval(intervalId);
	}

	onDestroy(() => {
		stopGettingPriceRatio();
	});

	onMount(() => {
		if ($signerAddress) {
			balancesStore.refreshBalances($wagmiConfig, $signerAddress as Hex);
			balancesStore.refreshFooterStats($wagmiConfig, $quoterAddress, $cusdxAddress);
		}
	});
</script>

{#if $wagmiConfig}
	<div class="flex min-h-screen flex-col">
		<Header launched={PUBLIC_LAUNCHED === 'true'} />
		<main class="flex-grow bg-[#1C02B8]">
			<slot />
		</main>
	</div>
{/if}

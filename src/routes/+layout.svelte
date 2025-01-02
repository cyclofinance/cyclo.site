<script lang="ts">
	import '../app.css';
	import { defaultConfig, signerAddress, wagmiConfig } from 'svelte-wagmi';
	import { injected, walletConnect } from '@wagmi/connectors';
	import Header from '$lib/components/Header.svelte';
	import { PUBLIC_WALLETCONNECT_ID } from '$env/static/public';
	import { browser } from '$app/environment';
	import { PUBLIC_LAUNCHED } from '$env/static/public';
	import { flare } from '@wagmi/core/chains';
	import { cusdxAddress, cysFlrAddress, quoterAddress, sFlrAddress } from '$lib/stores';
	import balancesStore from '$lib/balancesStore';
	import blockNumberStore from '$lib/blockNumberStore';
	import { onDestroy } from 'svelte';

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
		balancesStore.refreshPrices(
			$wagmiConfig,
			$cysFlrAddress,
			$quoterAddress,
			$cusdxAddress,
			$sFlrAddress
		);
		if ($signerAddress) {
			balancesStore.refreshBalances($wagmiConfig, $sFlrAddress, $cysFlrAddress, $signerAddress);
		}
	};

	$: if (browser && window.navigator) {
		initWallet();
	}

	$: if ($signerAddress) {
		balancesStore.refreshBalances($wagmiConfig, $sFlrAddress, $cysFlrAddress, $signerAddress);
	}

	const startGettingPricesAndBalances = () => {
		blockNumberStore.refresh($wagmiConfig);
		balancesStore.refreshPrices(
			$wagmiConfig,
			$cysFlrAddress,
			$quoterAddress,
			$cusdxAddress,
			$sFlrAddress
		);
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
	<div class="flex min-h-screen flex-col">
		<Header launched={PUBLIC_LAUNCHED === 'true'} />
		<main class="flex-grow bg-[#1C02B8]">
			<slot />
		</main>
	</div>
{/if}

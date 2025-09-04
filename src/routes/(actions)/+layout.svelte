<script lang="ts">
	import { signerAddress, wagmiConfig } from 'svelte-wagmi';
	import { page } from '$app/stores';
	import balancesStore from '$lib/balancesStore';
	import TransactionModal from '$lib/components/TransactionModal.svelte';
	import { selectedCyToken } from '$lib/stores';
	import type { Hex } from 'viem';
	import { base } from '$app/paths';
	import Footer from '$lib/components/Footer.svelte';
	import HrefButton from '$lib/components/HrefButton.svelte';

	$: if ($selectedCyToken && $signerAddress) {
		balancesStore.refreshBalances($wagmiConfig, $signerAddress as Hex);
		balancesStore.refreshPrices($wagmiConfig, $selectedCyToken);
	}
</script>

<div class="flex flex-grow flex-col items-center gap-6 bg-[#1C02B8] p-2 sm:p-6">
	<div class="flex h-fit max-w-prose gap-6">
		<HrefButton href={base + '/lock'} class="w-24 sm:w-32" inset={$page.url.pathname === '/lock'}
			>LOCK</HrefButton
		>
		<HrefButton
			href={base + '/unlock'}
			class="w-24 sm:w-32"
			inset={$page.url.pathname === '/unlock'}>UNLOCK</HrefButton
		>
		<HrefButton href={base + '/chart'} class="w-24 sm:w-32" inset={$page.url.pathname === '/chart'}
			>CHART</HrefButton
		>
	</div>
	<slot />
	<Footer />
	<TransactionModal />
</div>

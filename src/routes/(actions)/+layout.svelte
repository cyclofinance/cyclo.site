<script lang="ts">
	import { signerAddress, wagmiConfig } from 'svelte-wagmi';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import balancesStore from '$lib/balancesStore';
	import TransactionModal from '$lib/components/TransactionModal.svelte';
	import { selectedCyToken } from '$lib/stores';

	import Button from '$lib/components/Button.svelte';
	import { base } from '$app/paths';
	import Footer from '$lib/components/Footer.svelte';

	$: if ($selectedCyToken && $signerAddress) {
		balancesStore.refreshBalances($wagmiConfig, $signerAddress as Hex);
		balancesStore.refreshPrices($wagmiConfig, $selectedCyToken);
	}

	$: console.log($balancesStore);
</script>

<div class="flex flex-grow flex-col items-center gap-6 bg-[#1C02B8] p-2 sm:p-6">
	<div class="flex h-fit max-w-prose gap-6">
		<Button
			class="w-24 sm:w-32"
			inset={$page.url.pathname === '/lock'}
			on:click={() => goto(base + '/lock')}>LOCK</Button
		>
		<Button
			class="w-24 sm:w-32"
			inset={$page.url.pathname === '/unlock'}
			on:click={() => goto(base + '/unlock')}>UNLOCK</Button
		>
	</div>
	<slot />
	<Footer />
	<TransactionModal />
</div>

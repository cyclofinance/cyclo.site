<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		availableNetworks,
		activeNetworkKey,
		setActiveNetwork,
		setActiveNetworkByChainId
	} from '$lib/stores';
	import { switchNetwork } from '@wagmi/core';
	import { wagmiConfig, chainId, signerAddress } from 'svelte-wagmi';

	// Sync UI to wallet's chain on initial page load (handles hard refresh case)
	onMount(() => {
		let hasSynced = false;

		const syncToWalletChain = () => {
			if (hasSynced) return;

			const currentChainId = get(chainId);
			const currentSignerAddress = get(signerAddress);

			// Only sync once when wallet is connected and we have a chainId
			if (currentChainId && currentSignerAddress) {
				// Check if the wallet's chain matches any supported network
				const matchingNetwork = availableNetworks.find((n) => n.chain.id === currentChainId);
				if (matchingNetwork) {
					// Sync UI to match wallet's chain
					setActiveNetworkByChainId(currentChainId);
					hasSynced = true;
				}
			}
		};

		// Subscribe to both chainId and signerAddress to handle wallet connection timing
		const unsubscribeChainId = chainId.subscribe(() => syncToWalletChain());
		const unsubscribeSignerAddress = signerAddress.subscribe(() => syncToWalletChain());

		return () => {
			unsubscribeChainId();
			unsubscribeSignerAddress();
		};
	});

	const handleChange = async (event: Event) => {
		const target = event.target as HTMLSelectElement;
		const networkKey = target.value;
		const selectedNetwork = availableNetworks.find((network) => network.key === networkKey);

		setActiveNetwork(networkKey);

		if (selectedNetwork) {
			try {
				const config = $wagmiConfig;
				if (config) {
					await switchNetwork(config, { chainId: selectedNetwork.chain.id });
				}
			} catch (error) {
				console.warn(`Failed to switch wallet network to ${selectedNetwork.key}:`, error);
			}
		}
	};
</script>

<label class="flex items-center gap-2 text-xs font-semibold text-white sm:text-sm">
	<span class="hidden sm:inline">Network</span>
	<select
		class="rounded border border-white/40 bg-[#1C02B8] px-2 py-1 text-white focus:border-white focus:outline-none"
		value={$activeNetworkKey}
		on:change={handleChange}
		data-testid="network-switcher"
	>
		{#each availableNetworks as network}
			<option value={network.key} class="text-black">
				{network.chain.name}
			</option>
		{/each}
	</select>
</label>

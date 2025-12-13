<script lang="ts">
	import { selectedNetwork, supportedNetworks } from '$lib/stores';
	import { wagmiConfig } from 'svelte-wagmi';
	import { switchChain } from '@wagmi/core';

	function handleNetworkChange(networkConfig: (typeof supportedNetworks)[0]) {
		if ($selectedNetwork.chain.id === networkConfig.chain.id) {
			return;
		}

		selectedNetwork.set(networkConfig);

		// Try to switch chain if wallet is connected and wagmi config is available
		if ($wagmiConfig) {
			try {
				switchChain($wagmiConfig, { chainId: networkConfig.chain.id }).catch((error) => {
					console.error('Failed to switch chain:', error);
					// User might have rejected the switch, but we still update the selected network
				});
			} catch (error) {
				console.error('Error switching chain:', error);
			}
		}
	}
</script>

<select
	class="cursor-pointer rounded border border-white bg-transparent px-2 py-1 text-sm text-white"
	value={$selectedNetwork.chain.id}
	on:change={(e) => {
		const selectedId = Number(e.currentTarget.value);
		const network = supportedNetworks.find((n) => n.chain.id === selectedId);
		if (network) {
			handleNetworkChange(network);
		}
	}}
	data-testid="network-selector"
>
	{#each supportedNetworks as network}
		<option value={network.chain.id}>{network.chain.name}</option>
	{/each}
</select>

<script lang="ts">
	import { availableNetworks, activeNetworkKey, setActiveNetwork } from '$lib/stores';
	import { switchNetwork } from '@wagmi/core';
	import { wagmiConfig } from 'svelte-wagmi';

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
				console.warn(`Failed to switch wallet network to ${selectedNetwork.displayName}:`, error);
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
				{network.displayName}
			</option>
		{/each}
	</select>
</label>

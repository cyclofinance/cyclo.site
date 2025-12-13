<script lang="ts">
	import AccountSummary from '$lib/components/AccountSummary.svelte';
	import RewardsPlaceholder from '$lib/components/RewardsPlaceholder.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import RewardsInfo from '$lib/components/RewardsInfo.svelte';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import { signerAddress } from 'svelte-wagmi';
	import {
		selectedCyToken,
		tokens,
		selectedNetwork,
		isFlareNetwork,
		supportedNetworks
	} from '$lib/stores';
	import { wagmiConfig } from 'svelte-wagmi';
	import { switchChain } from '@wagmi/core';
	import { flare } from '@wagmi/core/chains';

	$: if ($tokens.length > 0 && !$selectedCyToken) {
		$selectedCyToken = $tokens[0]; // Set to first token
	}

	$: isFlare = isFlareNetwork($selectedNetwork);

	function switchToFlare() {
		const flareNetwork = supportedNetworks.find((n) => n.chain.id === flare.id);
		if (flareNetwork && $wagmiConfig) {
			selectedNetwork.set(flareNetwork);
			switchChain($wagmiConfig, { chainId: flare.id }).catch((error) => {
				console.error('Failed to switch chain:', error);
			});
		}
	}
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	{#if !isFlare}
		<div class="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 text-yellow-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<div>
						<h3 class="text-lg font-semibold text-yellow-500">Flare Network Required</h3>
						<p class="text-sm text-yellow-400">
							Rewards are only available on the Flare network. Please switch to Flare to view
							rewards.
						</p>
					</div>
				</div>
				<button
					on:click={switchToFlare}
					class="rounded-lg bg-yellow-500 px-4 py-2 font-medium text-white hover:bg-yellow-600"
				>
					Switch to Flare
				</button>
			</div>
		</div>
	{/if}
	<StatsPanel />
	<RewardsInfo />
	{#if $signerAddress}
		<AccountSummary account={$signerAddress} />
	{:else}
		<RewardsPlaceholder />
	{/if}
	<Leaderboard />
</div>

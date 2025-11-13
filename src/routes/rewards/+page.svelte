<script lang="ts">
	import AccountSummary from '$lib/components/AccountSummary.svelte';
	import RewardsPlaceholder from '$lib/components/RewardsPlaceholder.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import RewardsInfo from '$lib/components/RewardsInfo.svelte';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import Card from '$lib/components/Card.svelte';
	import { signerAddress } from 'svelte-wagmi';
	import { selectedCyToken, tokens, activeNetworkKey, activeNetworkConfig } from '$lib/stores';

	$: if ($tokens.length > 0) {
		$selectedCyToken = $tokens[0];
	}
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	{#if $activeNetworkKey === 'flare'}
		<StatsPanel />
		<RewardsInfo />
		{#if $signerAddress}
			<AccountSummary account={$signerAddress} />
		{:else}
			<RewardsPlaceholder />
		{/if}
		<Leaderboard />
	{:else}
		<Card customClass="items-stretch">
			<div class="space-y-6" data-testid="rewards-network-unavailable">
				<div class="flex flex-col gap-2">
					<h2 class="text-xl font-semibold text-white">Rewards Unavailable</h2>
					<p class="text-gray-300">
						Rewards are currently only available on Flare network. Please switch to Flare to view
						rewards information.
					</p>
					<p class="text-sm text-gray-400">
						Current network: <span class="font-semibold">{$activeNetworkConfig.displayName}</span>
					</p>
				</div>
			</div>
		</Card>
	{/if}
</div>

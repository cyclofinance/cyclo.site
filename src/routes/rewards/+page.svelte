<script lang="ts">
	import AccountSummary from '$lib/components/AccountSummary.svelte';
	import RewardsPlaceholder from '$lib/components/RewardsPlaceholder.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import RewardsInfo from '$lib/components/RewardsInfo.svelte';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import { signerAddress } from 'svelte-wagmi';
	import { selectedCyToken, tokens } from '$lib/stores';

	$selectedCyToken = tokens[0]; // Set to cysFLR
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	<StatsPanel />
	<RewardsInfo />
	{#if $signerAddress}
		<AccountSummary account={$signerAddress} />
	{:else}
		<RewardsPlaceholder />
	{/if}
	<Leaderboard />
</div>

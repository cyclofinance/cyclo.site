<script lang="ts">
	import AccountSummary from '$lib/components/AccountSummary.svelte';
	import RewardsPlaceholder from '$lib/components/RewardsPlaceholder.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import CurrentAPY from '$lib/components/CurrentAPY.svelte';
	import { signerAddress } from 'svelte-wagmi';
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	<CurrentAPY />
	{#if $signerAddress}
		<AccountSummary account={$signerAddress} />
	{:else}
		<RewardsPlaceholder />
	{/if}
	<Leaderboard />
</div>

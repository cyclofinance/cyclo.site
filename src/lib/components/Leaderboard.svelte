<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchTopRewards, type LeaderboardEntry } from '$lib/queries/fetchTopRewards';
	import Card from './Card.svelte';
	import { signerAddress } from 'svelte-wagmi';

	let loading = true;
	let error: string | null = null;
	let leaderboard: LeaderboardEntry[] = [];

	onMount(async () => {
		try {
			leaderboard = await fetchTopRewards();
			loading = false;
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Failed to fetch leaderboard';
			loading = false;
		}
	});

	$: isConnectedWallet = (account: string) =>
		$signerAddress?.toLowerCase() === account.toLowerCase();
</script>

<Card>
	<div class="space-y-6">
		<h2 class="text-xl font-semibold text-white">Top 50 Accounts</h2>

		{#if loading}
			<div class="flex min-h-[200px] items-center justify-center" data-testid="loader">
				<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
			</div>
		{:else if error}
			<div class="text-error bg-error/10 rounded-lg p-4">
				{error}
			</div>
		{:else}
			<div class="space-y-2">
				<div class="grid grid-cols-5 gap-8 text-sm text-gray-300">
					<div>Account</div>
					<div>Net cysFLR</div>
					<div>Net cyWETH</div>
					<div>Share</div>
					<div>Estimated rFLR</div>
				</div>
				{#if leaderboard?.length > 0}
					{#each leaderboard as entry, i}
						<a
							href={`/rewards/${entry.account}`}
							class="grid w-full grid-cols-5 gap-8 rounded py-4 text-left font-mono {isConnectedWallet(
								entry.account
							)
								? 'bg-white/10 hover:bg-white/20'
								: 'bg-base-200 hover:bg-base-300'}"
						>
							<div class="truncate font-medium text-white">
								#{i + 1}
								{entry.account.slice(0, 6)}...{entry.account.slice(-4)}
							</div>
							<div class="truncate font-medium text-white">{entry.netTransfers.cysFLR}</div>
							<div class="truncate font-medium text-white">{entry.netTransfers.cyWETH}</div>
							<div class="truncate font-medium text-white">{entry.percentage.toFixed(4)}%</div>
							<div class="truncate font-medium text-white">{entry.proRataReward.toFixed(2)}</div>
						</a>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</Card>

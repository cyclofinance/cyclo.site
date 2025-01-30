<script lang="ts">
	import { onMount } from 'svelte';
	import Card from './Card.svelte';
	import { fetchStats, type GlobalStats } from '$lib/queries/fetchStats';
	import { formatEther } from 'ethers';

	let loading = true;
	let error: string | null = null;
	let stats: GlobalStats | null = null;

	onMount(async () => {
		try {
			stats = await fetchStats();
			loading = false;
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Failed to fetch stats';
			loading = false;
		}
	});
</script>

<Card>
	{#if loading}
		<div class="flex min-h-[100px] items-center justify-center" data-testid="loader">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
		</div>
	{:else if error}
		<div class="text-error bg-error/10 rounded-lg p-4" data-testid="error">
			{error}
		</div>
	{:else if stats}
		<div class="grid grid-cols-4 gap-8" data-testid="stats-panel">
			<!-- Current APY -->
			<div class="space-y-4">
				<div class="text-sm text-gray-300">Current APY</div>
				<div class="space-y-2">
					<div class="flex items-baseline gap-2">
						<div class="text-sm text-gray-300">cysFLR:</div>
						<div class="font-mono text-3xl font-bold text-white">
							~{Number(formatEther(stats.cysFLRApy)).toFixed(4)}%
						</div>
					</div>
					<div class="flex items-baseline gap-2">
						<div class="text-sm text-gray-300">cyWETH:</div>
						<div class="font-mono text-3xl font-bold text-white">
							~{Number(formatEther(stats.cyWETHApy)).toFixed(4)}%
						</div>
					</div>
				</div>
			</div>

			<!-- Eligible Holders -->
			<div class="space-y-4">
				<div class="text-sm text-gray-300">Eligible Holders</div>
				<div class="font-mono text-3xl font-bold text-white">
					{stats.eligibleHolders.toLocaleString()}
				</div>
			</div>

			<!-- Total Eligible Tokens -->
			<div class="space-y-4">
				<div class="text-sm text-gray-300">Total Eligible cy* Tokens</div>
				<div class="font-mono text-3xl font-bold text-white">
					${Number(formatEther(stats.totalEligibleSum)).toFixed(2).toLocaleString()}
				</div>
				<div class="space-y-1 font-mono text-sm text-gray-400">
					<div>cysFLR: {Number(formatEther(stats.totalEligibleCysFLR)).toFixed(2)}</div>
					<div>cyWETH: {Number(formatEther(stats.totalEligibleCyWETH)).toFixed(2)}</div>
				</div>
			</div>

			<!-- Monthly Rewards -->
			<div class="space-y-4">
				<div class="text-sm text-gray-300">Monthly rFLR Rewards</div>
				<div class="font-mono text-3xl font-bold text-white">
					{Number(formatEther(stats.monthlyRewards)).toLocaleString()}
				</div>
			</div>
		</div>
	{/if}
</Card>

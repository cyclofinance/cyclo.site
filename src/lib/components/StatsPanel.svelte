<script lang="ts">
	import { onMount } from 'svelte';
	import Card from './Card.svelte';
	import { fetchStats, type GlobalStats } from '$lib/queries/fetchStats';

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

<Card customClass="items-stretch">
	{#if loading}
		<div class="flex min-h-[100px] items-center justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
		</div>
	{:else if error}
		<div class="text-error bg-error/10 rounded-lg p-4">
			{error}
		</div>
	{:else if stats}
		<div class="grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4">
			<div class="space-y-1">
				<div class="text-sm text-gray-300">Current APY</div>
				<div class="text-lg font-bold text-white sm:text-2xl">
					{stats.currentApy.toLocaleString()}%
				</div>
			</div>
			<div class="space-y-1">
				<div class="text-sm text-gray-300">Eligible Holders</div>
				<div class="text-lg font-bold text-white sm:text-2xl">
					{stats.eligibleHolders.toLocaleString()}
				</div>
			</div>
			<div class="space-y-1">
				<div class="text-sm text-gray-300">Total Eligible cysFLR</div>
				<div class="text-lg font-bold text-white sm:text-2xl">
					{stats.totalEligibleHoldings.toLocaleString()}
				</div>
			</div>
			<div class="space-y-1">
				<div class="text-sm text-gray-300">Monthly rFLR Rewards</div>
				<div class="text-lg font-bold text-white sm:text-2xl">
					{stats.monthlyRewards.toLocaleString()}
				</div>
			</div>
		</div>
	{/if}
</Card>

<script lang="ts">
	import { onMount } from 'svelte';
	import Card from './Card.svelte';
	import { fetchStats } from '$lib/queries/fetchStats';
	import { formatEther } from 'ethers';
	import type { GlobalStats } from '$lib/types';
	import { TOTAL_REWARD } from '$lib/constants';
	import { selectedNetwork, tokens } from '$lib/stores';
	import { formatUnits } from 'viem';

	let loading = true;
	let error: string | null = null;
	let stats: GlobalStats | null = null;

	async function loadStats() {
		loading = true;
		error = null;
		try {
			stats = await fetchStats();
			loading = false;
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Failed to fetch stats';
			loading = false;
		}
	}

	onMount(() => {
		loadStats();
	});

	// Re-fetch stats when network changes
	$: if ($selectedNetwork) {
		loadStats();
	}
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
		<div class="grid w-full grid-cols-1 gap-8 md:grid-cols-4" data-testid="stats-panel">
			<!-- Current APY -->
			<div class="space-y-4">
				<div class="text-sm text-gray-300">Current APY</div>
				<div class="space-y-2">
					{#each $tokens as token}
						{@const apyValue = Number(formatEther(stats.apy[token.symbol] || 0n))}
						{@const apyDisplay =
							apyValue === 0 ? '0.0000' : apyValue < 0.0001 ? '< 0.0001' : apyValue.toFixed(4)}
						<div class="flex items-baseline gap-2">
							<div class="text-sm text-gray-300">{token.symbol}:</div>
							<div class="font-mono text-3xl font-bold text-white">
								~{apyDisplay}%
							</div>
						</div>
					{/each}
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
					{Number(formatEther(stats.totalEligibleSum)).toFixed(2).toLocaleString()}
				</div>
				<div class="space-y-1 font-mono text-sm text-gray-400">
					{#each $tokens as token}
						<div>
							{token.symbol}: {Number(formatUnits(stats.totalEligible[token.symbol] || 0n, token.decimals)).toFixed(
								2
							)}
						</div>
					{/each}
				</div>
			</div>

			<!-- Monthly Rewards -->
			<div class="space-y-4">
				<div class="text-sm text-gray-300">Monthly rFLR Rewards</div>
				<div class="font-mono text-3xl font-bold text-white">
					Total: {Number(formatEther(TOTAL_REWARD)).toLocaleString()}
				</div>
				<div class="space-y-1 font-mono text-sm text-gray-400">
					{#each $tokens as token}
						<div>
							{token.symbol}: {Number(
								formatEther(stats.rewardsPools[token.symbol] || 0n)
							).toLocaleString()}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</Card>

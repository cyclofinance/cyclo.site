<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchAccountStatus, type AccountStats } from '$lib/queries/fetchAccountStatus';
	import Card from './Card.svelte';
	import { goto } from '$app/navigation';

	export let account: string;

	let loading = true;
	let error: string | null = null;
	let stats: AccountStats | null = null;

	onMount(async () => {
		try {
			stats = await fetchAccountStatus(account);
			loading = false;
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Failed to fetch account status';
			loading = false;
		}
	});

	$: isEligible = stats?.percentage && stats.percentage > 0;
</script>

<Card>
	{#if loading}
		<div class="flex min-h-[200px] items-center justify-center" data-testid="loader">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
		</div>
	{:else if error}
		<div class="text-error bg-error/10 rounded-lg p-4">
			{error}
		</div>
	{:else if stats}
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white">Your Rewards</h2>
				<button
					data-testid="full-tx-history-button"
					class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
					on:click={() => goto(`/rewards/${account}`)}
				>
					Full Tx History
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</button>
			</div>

			{#if !isEligible}
				<div class="bg-error/10 rounded p-4 text-gray-200">
					This account is not eligible for rewards. Only accounts with positive net transfers from
					approved sources are eligible.
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-8">
				<div class="space-y-1">
					<div class="text-sm text-gray-300">Net cysFLR</div>
					<div class="font-mono text-white">{stats.netTransfers.cysFLR}</div>
				</div>
				<div class="space-y-1">
					<div class="text-sm text-gray-300">Net cyWETH</div>
					<div class="font-mono text-white">{stats.netTransfers.cyWETH}</div>
				</div>
				<div class="space-y-1">
					<div class="text-sm text-gray-300">Share</div>
					<div class="font-mono text-white">{stats.percentage.toFixed(4)}%</div>
				</div>
				<div class="space-y-1">
					<div class="text-sm text-gray-300">Estimated rFLR</div>
					<div class="font-mono text-white">{stats.proRataReward.toFixed(2)}</div>
				</div>
			</div>
		</div>
	{/if}
</Card>

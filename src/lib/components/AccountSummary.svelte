<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchAccountStatus, type PeriodStats } from '$lib/queries/fetchAccountStatus';
	import { formatEther } from 'ethers';
	import Card from './Card.svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';

	export let account: string;

	let loading = true;
	let error: string | null = null;
	let periodStats: PeriodStats[] = [];

	onMount(async () => {
		try {
			const data = await fetchAccountStatus(account);
			periodStats = data.periodStats;
			loading = false;
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Failed to fetch account status';
			loading = false;
		}
	});

	$: isEligible = periodStats[0]?.percentage > 0;
</script>

<Card customClass="items-stretch">
	{#if loading}
		<div class="flex min-h-[200px] items-center justify-center">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
		</div>
	{:else if error}
		<div class="text-error bg-error/10 rounded-lg p-4">
			{error}
		</div>
	{:else}
		<div class="space-y-6">
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-white">Your Rewards</h2>
					<button
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
			</div>

			{#if !isEligible}
				<div class="bg-error/10 rounded text-gray-200">
					This account is not eligible for rewards. Only accounts with positive net transfers from
					approved sources are eligible.
				</div>
			{/if}

			{#each periodStats as stat}
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-8">
					<div class="space-y-1">
						<div class="text-sm text-gray-300">Period</div>
						<div class="font-medium text-white">{stat.period}</div>
					</div>
					<div class="space-y-1">
						<div class="text-sm text-gray-300">Net Transfers</div>
						<div class="font-medium text-white">{formatEther(stat.accountNet)}</div>
					</div>
					{#if isEligible}
						<div class="space-y-1">
							<div class="text-sm text-gray-300">Share</div>
							<div class="font-medium text-white">{stat.percentage}%</div>
						</div>
						<div class="space-y-1">
							<div class="text-sm text-gray-300">Estimated rFLR</div>
							<div class="font-medium text-white">{stat.proRataReward}</div>
						</div>
					{:else}
						<div class="space-y-1">
							<div class="text-sm text-gray-300">Share</div>
							<div class="font-medium text-white">0%</div>
						</div>
						<div class="space-y-1">
							<div class="text-sm text-gray-300">Estimated rFLR</div>
							<div class="font-medium text-white">0</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</Card>

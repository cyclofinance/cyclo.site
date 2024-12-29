<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchAccountStatus, type PeriodStats } from '$lib/queries/fetchAccountStatus';
	import type { AccountStatusQuery } from '../../generated-graphql';
	import { formatEther } from 'ethers';

	export let account: string;

	let loading = true;
	let error: string | null = null;
	let periodStats: PeriodStats[] = [];
	let transfers: NonNullable<AccountStatusQuery['sentTransfers']> = [];

	onMount(async () => {
		try {
			const data = await fetchAccountStatus(account);
			periodStats = data.periodStats;
			transfers = data.transfers;
			loading = false;
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Failed to fetch account status';
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="flex min-h-[200px] items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
	</div>
{:else if error}
	<div class="text-error bg-error/10 rounded-lg p-4">
		{error}
	</div>
{:else}
	<div class="space-y-8 text-white">
		<!-- Period Stats -->
		<div class="bg-base-200 rounded-lg p-6">
			<h2 class="mb-4 text-xl font-semibold">Period Statistics</h2>
			{#each periodStats as stat}
				<div class="mb-4 grid grid-cols-4 gap-4">
					<div class="space-y-1">
						<div class="text-base-content/60 text-sm">Period</div>
						<div class="font-medium">{stat.period}</div>
					</div>
					<div class="space-y-1">
						<div class="text-base-content/60 text-sm">Net Transfers</div>
						<div class="font-medium">{formatEther(stat.accountNet)}</div>
					</div>
					<div class="space-y-1">
						<div class="text-base-content/60 text-sm">Share</div>
						<div class="font-medium">{stat.percentage}%</div>
					</div>
					<div class="space-y-1">
						<div class="text-base-content/60 text-sm">Estimated rFLR</div>
						<div class="font-medium">{stat.proRataReward}</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Transfers -->
		<div class="bg-base-200 rounded-lg p-6">
			<h2 class="mb-4 text-xl font-semibold">Transfer History</h2>
			<div class="space-y-2">
				{#each transfers as transfer}
					<div
						class="bg-base-100 flex items-center justify-between rounded p-3 {transfer.fromIsApprovedSource
							? 'border-success border-l-4'
							: ''}"
					>
						<div class="space-y-1">
							<div class="text-sm">
								{#if transfer.from.id === account}
									<span class="text-error">Sent to {transfer.to.id}</span>
								{:else}
									<span class="text-success">Received from {transfer.from.id}</span>
								{/if}
							</div>
							<div class="text-base-content/60 text-xs">
								Block: {new Date(+transfer.blockTimestamp * 1000).toLocaleString()}
							</div>
						</div>
						<div class="font-medium">
							{formatEther(transfer.value)}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

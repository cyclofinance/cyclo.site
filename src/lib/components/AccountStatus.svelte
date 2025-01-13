<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchAccountStatus, type PeriodStats } from '$lib/queries/fetchAccountStatus';
	import type { AccountStatusQuery } from '../../generated-graphql';
	import { formatEther, getAddress } from 'ethers';
	import Card from './Card.svelte';

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

	$: isEligible = periodStats[0]?.percentage > 0;
</script>

{#if loading}
	<div class="flex min-h-[200px] items-center justify-center" data-testid="loader">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
	</div>
{:else if error}
	<div class="text-error bg-error/10 rounded-lg p-4">
		{error}
	</div>
{:else}
	<div class="space-y-8">
		<Card customClass="items-stretch">
			<div class="space-y-6" data-testid="period-stats">
				<h2 class="text-xl font-semibold text-white">
					Estimated Rewards for {account.slice(0, 6)}...{account.slice(-4)}
				</h2>

				{#if !isEligible}
					<div class="bg-error/10 rounded py-4 text-gray-200">
						This account is not eligible for rewards. Only accounts with positive net transfers from
						approved sources are eligible.
					</div>
				{/if}

				{#each periodStats as stat}
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8">
						<div class="space-y-1">
							<div class="text-sm text-gray-300">Period</div>
							<div class="font-medium text-white">{stat.period}</div>
						</div>
						<div class="space-y-1">
							<div class="text-sm text-gray-300">Net Transfers</div>
							<div class="truncate font-medium text-white">{formatEther(stat.accountNet)}</div>
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
		</Card>

		<Card customClass="items-stretch">
			<div class="space-y-6" data-testid="transfer-history">
				<h2 class="text-xl font-semibold text-white">Transfer History</h2>
				<div class="space-y-2">
					{#each transfers as transfer}
						<a
							href={`https://flarescan.com/tx/${transfer.transactionHash}`}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center justify-between rounded py-2 {transfer.fromIsApprovedSource
								? 'border-success bg-base-200 border-l-4'
								: 'bg-base-200'} hover:bg-base-300"
						>
							<div class="space-y-1">
								<div class="text-sm">
									{#if getAddress(transfer.from.id) === getAddress(account)}
										<span class="text-error"
											>Sent to {transfer.to.id.slice(0, 6)}...{transfer.to.id.slice(-4)}</span
										>
									{:else}
										<span class="text-success"
											>Received from {transfer.from.id.slice(0, 6)}...{transfer.from.id.slice(
												-4
											)}</span
										>
									{/if}
								</div>
								<div class="text-xs text-gray-300">
									{new Date(+transfer.blockTimestamp * 1000).toLocaleString()}
								</div>
							</div>
							<div class="truncate pl-4 font-medium text-white">
								{formatEther(transfer.value)}
							</div>
						</a>
					{/each}
				</div>
			</div>
		</Card>
	</div>
{/if}

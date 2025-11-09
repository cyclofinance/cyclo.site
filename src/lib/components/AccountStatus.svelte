<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchAccountStatus } from '$lib/queries/fetchAccountStatus';
	import { getAddress } from 'ethers';
	import Card from './Card.svelte';
import { tokens } from '$lib/stores';
	import { isAddressEqual } from 'viem';
	import type { AccountStats } from '$lib/types';
	import { formatEther } from 'viem';
	import AccountStatsComponent from './AccountStats.svelte';

	export let account: string;

	let loading = true;
	let error: string | null = null;
	let stats: AccountStats | null = null;

const resolveTokenLabel = (address: string) => {
	const tokenMatch = $tokens.find((token) => isAddressEqual(address, token.address));
	return tokenMatch?.name ?? 'Unknown';
};

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
</script>

{#if loading}
	<div class="flex min-h-[200px] items-center justify-center" data-testid="loader">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
	</div>
{:else if error}
	<div class="text-error bg-error/10 rounded-lg p-4">
		{error}
	</div>
{:else if stats}
	<div class="space-y-8">
		<Card customClass="items-stretch">
			<div class="space-y-6" data-testid="period-stats">
				<h2 class="text-xl font-semibold text-white">
					Estimated Rewards for {account.slice(0, 6)}...{account.slice(-4)}
				</h2>

				<AccountStatsComponent {stats} />
			</div>
		</Card>

		<Card customClass="items-stretch">
			<div class="space-y-6" data-testid="transfer-history">
				<h2 class="text-xl font-semibold text-white">Transfer History</h2>
				<div class="space-y-2">
					{#each [...stats.transfers.in, ...stats.transfers.out].sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp)) as transfer}
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
									{new Date(Number(transfer.blockTimestamp) * 1000).toLocaleString()}
								</div>
							</div>
							<div class="flex items-center gap-2 truncate pl-4 font-mono text-white">
								<span class="text-xs text-gray-300">{resolveTokenLabel(transfer.tokenAddress)}</span>
								<span>{formatEther(transfer.value)}</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</Card>
	</div>
{/if}

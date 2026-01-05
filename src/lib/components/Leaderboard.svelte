<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchTopRewards } from '$lib/queries/fetchTopRewards';
	import Card from './Card.svelte';
	import { signerAddress } from 'svelte-wagmi';
	import type { LeaderboardEntry } from '$lib/types';
	import { formatEther, formatUnits } from 'viem';
	import { tokens } from '$lib/stores';

	// Calculate grid columns: 1 for account + 2 per token (balance + rewards) + 1 for total
	$: gridCols = 1 + $tokens.length * 2 + 1;

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
			<div class="space-y-2 overflow-x-auto">
				<div
					class="grid gap-8 text-sm text-gray-300"
					style="grid-template-columns: repeat({gridCols}, minmax(120px, 1fr));"
				>
					<div>Account</div>
					{#each $tokens as token}
						<div>Net {token.symbol}</div>
						<div>{token.symbol} rewards (rFLR)</div>
					{/each}
					<div>Total Estimated rFLR</div>
				</div>
				{#if leaderboard?.length > 0}
					{#each leaderboard as entry, i}
						<a
							href={`/rewards/${entry.account}`}
							class="grid gap-8 rounded py-4 text-left font-mono {isConnectedWallet(entry.account)
								? 'bg-white/10 hover:bg-white/20'
								: 'bg-base-200 hover:bg-base-300'}"
							style="grid-template-columns: repeat({gridCols}, minmax(120px, 1fr));"
						>
							<div class="font-medium text-white">
								#{i + 1}
								{entry.account.slice(0, 6)}...{entry.account.slice(-4)}
							</div>
							{#each $tokens as token}
								<div class="font-medium text-white">
									{(+formatEther(entry.eligibleBalances[token.symbol] || 0n)).toFixed(4)}
								</div>
								<div class="flex flex-col gap-y-2 font-medium text-white">
									<span
										>{(+formatEther(entry.shares[token.symbol]?.rewardsAmount || 0n)).toFixed(
											4
										)}</span
									>
									<span>
										({(+formatUnits(entry.shares[token.symbol]?.percentageShare || 0n, 16)).toFixed(
											4
										)}%)
									</span>
								</div>
							{/each}
							<div data-testid="total-rewards" class="font-medium text-white">
								{(+formatEther(entry.shares.totalRewards)).toFixed(4)}
							</div>
						</a>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</Card>

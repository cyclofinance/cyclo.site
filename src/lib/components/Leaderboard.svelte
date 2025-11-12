<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchTopRewards } from '$lib/queries/fetchTopRewards';
	import Card from './Card.svelte';
	import { signerAddress } from 'svelte-wagmi';
	import type { LeaderboardEntry } from '$lib/types';
	import { formatEther, formatUnits } from 'viem';
	import { tokens } from '$lib/stores';

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

	$: tokenDecimalsByName = Object.fromEntries(
		($tokens ?? []).map((token) => [token.name, token.decimals])
	) as Record<string, number>;

	const getTokenDecimals = (tokenName: string) => tokenDecimalsByName[tokenName] ?? 18;

	// Helper to map token name to GraphQL field name (e.g., "cyWETH.pyth" -> "cyWETH")
	const getTokenFieldName = (tokenName: string): string => {
		return tokenName.replace(/\.pyth$/, '');
	};

	// Get token balance from entry based on token name
	const getTokenBalance = (entry: LeaderboardEntry, tokenName: string): bigint => {
		const fieldName = getTokenFieldName(tokenName);
		const balanceMap: Record<string, bigint> = {
			cysFLR: entry.eligibleBalances.cysFLR ?? 0n,
			cyWETH: entry.eligibleBalances.cyWETH ?? 0n,
			cyFXRP: entry.eligibleBalances.cyFXRP ?? 0n,
			cyWBTC: entry.eligibleBalances.cyWBTC ?? 0n,
			cycbBTC: entry.eligibleBalances.cycbBTC ?? 0n
		};
		return balanceMap[fieldName] ?? 0n;
	};

	// Get token share from entry based on token name
	const getTokenShare = (entry: LeaderboardEntry, tokenName: string) => {
		const fieldName = getTokenFieldName(tokenName);
		const shareMap: Record<string, { percentageShare: bigint; rewardsAmount: bigint }> = {
			cysFLR: entry.shares.cysFLR ?? { percentageShare: 0n, rewardsAmount: 0n },
			cyWETH: entry.shares.cyWETH ?? { percentageShare: 0n, rewardsAmount: 0n },
			cyFXRP: entry.shares.cyFXRP ?? { percentageShare: 0n, rewardsAmount: 0n },
			cyWBTC: entry.shares.cyWBTC ?? { percentageShare: 0n, rewardsAmount: 0n },
			cycbBTC: entry.shares.cycbBTC ?? { percentageShare: 0n, rewardsAmount: 0n }
		};
		return shareMap[fieldName] ?? { percentageShare: 0n, rewardsAmount: 0n };
	};

	$: isConnectedWallet = (account: string) =>
		$signerAddress?.toLowerCase() === account.toLowerCase();

	$: gridColumns = `150px repeat(${$tokens.length * 2}, 1fr) 150px`;
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
				<div class="grid gap-8 text-sm text-gray-300" style="grid-template-columns: {gridColumns};">
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
							class="grid w-full gap-8 rounded py-4 text-left font-mono {isConnectedWallet(
								entry.account
							)
								? 'bg-white/10 hover:bg-white/20'
								: 'bg-base-200 hover:bg-base-300'}"
							style="grid-template-columns: {gridColumns};"
						>
							<div class="font-medium text-white">
								#{i + 1}
								{entry.account.slice(0, 6)}...{entry.account.slice(-4)}
							</div>
							{#each $tokens as token}
								{@const balance = getTokenBalance(entry, token.name)}
								{@const share = getTokenShare(entry, token.name)}
								<div class="font-medium text-white">
									{(+formatUnits(balance, getTokenDecimals(token.name))).toFixed(4)}
								</div>
								<div class="font-medium text-white">
									<span>{(+formatEther(share.rewardsAmount)).toFixed(4)}</span>
									<span>
										({(+formatUnits(share.percentageShare, 16)).toFixed(4)}%)
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

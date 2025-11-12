<script lang="ts">
	import { onMount } from 'svelte';
	import Card from './Card.svelte';
	import { fetchStats } from '$lib/queries/fetchStats';
	import { formatEther } from 'ethers';
	import { formatUnits } from 'viem';
	import type { GlobalStats } from '$lib/types';
	import { TOTAL_REWARD } from '$lib/constants';
	import { tokens } from '$lib/stores';

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

	$: tokenDecimalsByName = Object.fromEntries(
		($tokens ?? []).map((token) => [token.name, token.decimals])
	) as Record<string, number>;

	const getTokenDecimals = (tokenName: string) => tokenDecimalsByName[tokenName] ?? 18;

	// Helper to map token name to GraphQL field name (e.g., "cyWETH.pyth" -> "cyWETH")
	const getTokenFieldName = (tokenName: string): string => {
		return tokenName.replace(/\.pyth$/, '');
	};

	// Get token data from stats based on token name
	const getTokenData = (tokenName: string) => {
		const fieldName = getTokenFieldName(tokenName);

		// Map field names to stats properties
		const apyMap: Record<string, bigint> = {
			cysFLR: stats?.cysFLRApy ?? 0n,
			cyWETH: stats?.cyWETHApy ?? 0n,
			cyFXRP: stats?.cyFXRPApy ?? 0n,
			cyWBTC: stats?.cyWBTCApy ?? 0n,
			cycbBTC: stats?.cycbBTCApy ?? 0n
		};

		const eligibleMap: Record<string, bigint> = {
			cysFLR: stats?.totalEligibleCysFLR ?? 0n,
			cyWETH: stats?.totalEligibleCyWETH ?? 0n,
			cyFXRP: stats?.totalEligibleCyFXRP ?? 0n,
			cyWBTC: stats?.totalEligibleCyWBTC ?? 0n,
			cycbBTC: stats?.totalEligibleCycbBTC ?? 0n
		};

		const rewardsMap: Record<string, bigint> = {
			cysFLR: stats?.rewardsPools.cysFlr ?? 0n,
			cyWETH: stats?.rewardsPools.cyWeth ?? 0n,
			cyFXRP: stats?.rewardsPools.cyFxrp ?? 0n,
			cyWBTC: stats?.rewardsPools.cyWbtc ?? 0n,
			cycbBTC: stats?.rewardsPools.cycbBtc ?? 0n
		};

		return {
			apy: apyMap[fieldName] ?? 0n,
			eligible: eligibleMap[fieldName] ?? 0n,
			rewards: rewardsMap[fieldName] ?? 0n
		};
	};
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
						{@const tokenData = getTokenData(token.name)}
						<div class="flex items-baseline gap-2">
							<div class="text-sm text-gray-300">{token.symbol}:</div>
							<div class="font-mono text-3xl font-bold text-white">
								~{Number(formatEther(tokenData.apy)).toFixed(4)}%
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
						{@const tokenData = getTokenData(token.name)}
						<div>
							{token.symbol}: {Number(
								formatUnits(tokenData.eligible, getTokenDecimals(token.name))
							).toFixed(2)}
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
						{@const tokenData = getTokenData(token.name)}
						<div>
							{token.symbol}: {Number(formatEther(tokenData.rewards)).toLocaleString()}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</Card>

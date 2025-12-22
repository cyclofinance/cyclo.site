import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { ONE } from '$lib/constants';
import { calculateRewardsPools } from './calculateRewardsPools';
import type { GlobalStats } from '$lib/types';
import { get } from 'svelte/store';
import { tokens, selectedNetwork } from '$lib/stores';
import { isAddressEqual } from 'viem';

// Map of token symbols to their price quote functions
const priceQuoteFunctions: Record<string, () => Promise<bigint>> = {
	cysFLR: getcysFLRwFLRPrice,
	cyWETH: getcyWETHwFLRPrice
	// TODO: Add price quote function for cyFXRP.ftso when available
};

export const calculateApy = (rewardPool: bigint, totalEligible: bigint, price: bigint) => {
	const numerator =
		rewardPool *
		12n * // 12 months
		100n * // will be a percentage
		ONE *
		ONE; // 18 decimals twice, once for the total eligible and once for the price
	const denominator = totalEligible * price;
	return denominator > 0n ? numerator / denominator : 0n;
};

/**
 * Aggregate total eligible amounts from cycloVaults
 */
function aggregateTotalEligible(cycloVaults: StatsQuery['cycloVaults']): Record<string, bigint> {
	const currentTokens = get(tokens);
	const totals: Record<string, bigint> = {};

	if (!cycloVaults) {
		// Initialize with zeros for all tokens
		for (const token of currentTokens) {
			totals[token.symbol] = 0n;
		}
		return totals;
	}

	// Aggregate totals from cycloVaults
	for (const vault of cycloVaults) {
		const vaultAddress = vault?.address;
		const totalEligible = BigInt(vault?.totalEligible || '0');

		if (!vaultAddress || totalEligible === 0n) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			if (!(token.symbol in totals)) {
				totals[token.symbol] = 0n;
			}
			totals[token.symbol] += totalEligible;
		}
	}

	// Ensure all tokens have entries (even if 0)
	for (const token of currentTokens) {
		if (!(token.symbol in totals)) {
			totals[token.symbol] = 0n;
		}
	}

	return totals;
}

export async function fetchStats(): Promise<GlobalStats> {
	const subgraphUrl = get(selectedNetwork).rewardsSubgraphUrl;
	const response = await fetch(subgraphUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: Stats
		})
	});
	const data: StatsQuery = (await response.json()).data;

	if (!data.eligibleTotals) throw 'No eligible totals';

	const currentTokens = get(tokens);

	// Aggregate totals from cycloVaults
	const totalEligible = aggregateTotalEligible(data.cycloVaults);
	const totalEligibleSum = Object.values(totalEligible).reduce((sum, val) => sum + val, 0n);
	const eligibleHolders = (data.accounts ?? []).length;

	// Create eligibleTotals structure for calculateRewardsPools
	const eligibleTotalsForPools = {
		...data.eligibleTotals,
		totalEligibleSum: totalEligibleSum.toString(),
		...Object.fromEntries(
			currentTokens.map((token) => [
				`totalEligible${token.symbol}`,
				totalEligible[token.symbol]?.toString() || '0'
			])
		)
	};

	const rewardsPools = calculateRewardsPools(eligibleTotalsForPools, currentTokens);

	// Get prices and calculate APY for each token that has a price quote function
	const apy: Record<string, bigint> = {};
	const pricePromises = currentTokens
		.filter((token) => priceQuoteFunctions[token.symbol])
		.map(async (token) => {
			try {
				const price = await priceQuoteFunctions[token.symbol]();
				const totalEligibleForToken = totalEligible[token.symbol] || 0n;
				const poolReward = rewardsPools[token.symbol] || 0n;
				apy[token.symbol] = calculateApy(poolReward, totalEligibleForToken, price);
			} catch (error) {
				console.error(`Failed to get price for ${token.symbol}:`, error);
				apy[token.symbol] = 0n;
			}
		});

	await Promise.all(pricePromises);

	// Initialize APY to 0 for tokens without price quote functions
	for (const token of currentTokens) {
		if (!(token.symbol in apy)) {
			apy[token.symbol] = 0n;
		}
	}

	return {
		eligibleHolders,
		totalEligible,
		totalEligibleSum,
		rewardsPools,
		apy
	};
}

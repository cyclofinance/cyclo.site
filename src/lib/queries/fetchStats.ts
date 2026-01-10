import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { getcyFXRPftsoWFLRPrice } from './cyFXRP.ftsowFLRQuote';
import { ONE } from '$lib/constants';
import { calculateRewardsPools } from './calculateRewardsPools';
import { aggregateTotalEligibleFromVaults } from './vaultUtils';
import type { GlobalStats } from '$lib/types';
import { get } from 'svelte/store';
import { tokens, selectedNetwork } from '$lib/stores';

// Map of token symbols to their price quote functions
const priceQuoteFunctions: Record<string, () => Promise<bigint>> = {
	cysFLR: getcysFLRwFLRPrice,
	cyWETH: getcyWETHwFLRPrice,
	'cyFXRP.ftso': getcyFXRPftsoWFLRPrice
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
	const totalEligible = aggregateTotalEligibleFromVaults(data.cycloVaults);
	
	// Calculate totalEligibleSum by normalizing all values to 18 decimals before summing
	// This is necessary because tokens have different decimal precisions (e.g., cyFXRP.ftso has 6 decimals)
	const totalEligibleSum = currentTokens.reduce((sum, token) => {
		const tokenTotal = totalEligible[token.symbol] || 0n;
		if (tokenTotal > 0n) {
			// Normalize to 18 decimals: if token has fewer decimals, multiply by 10^(18 - token.decimals)
			if (token.decimals < 18) {
				const decimalDiff = 18 - token.decimals;
				return sum + tokenTotal * (10n ** BigInt(decimalDiff));
			} else if (token.decimals === 18) {
				return sum + tokenTotal;
			} else {
				// If token has more than 18 decimals, divide (shouldn't happen but handle it)
				const decimalDiff = token.decimals - 18;
				return sum + tokenTotal / (10n ** BigInt(decimalDiff));
			}
		}
		return sum;
	}, 0n);
	
	const eligibleHolders = (data.accounts ?? []).length;

	// Create eligibleTotals structure for calculateRewardsPools
	// Normalize all individual token totals to 18 decimals for consistent comparison
	// This ensures the inverse fraction calculation works correctly across tokens with different decimals
	const eligibleTotalsForPools = {
		...data.eligibleTotals,
		totalEligibleSum: totalEligibleSum.toString(),
		totalEligibleSumSnapshot: totalEligibleSum.toString(), // Use our normalized sum
		...Object.fromEntries(
			currentTokens.map((token) => {
				const tokenTotal = totalEligible[token.symbol] || 0n;
				let normalizedTotal = tokenTotal;
				
				// Normalize to 18 decimals for consistent comparison
				if (token.decimals < 18 && tokenTotal > 0n) {
					const decimalDiff = 18 - token.decimals;
					normalizedTotal = tokenTotal * (10n ** BigInt(decimalDiff));
				} else if (token.decimals > 18 && tokenTotal > 0n) {
					const decimalDiff = token.decimals - 18;
					normalizedTotal = tokenTotal / (10n ** BigInt(decimalDiff));
				}
				
				return [
					`totalEligible${token.symbol}`,
					normalizedTotal.toString()
				];
			})
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
				
				// Only calculate APY if we have valid inputs
				if (price > 0n && totalEligibleForToken > 0n && poolReward > 0n) {
					
					const res = calculateApy(poolReward, totalEligibleForToken, price);
					apy[token.symbol] = res;
				} else {
					console.warn(`[APY] Skipping ${token.symbol} - invalid inputs:`, {
						price: price.toString(),
						totalEligible: totalEligibleForToken.toString(),
						poolReward: poolReward.toString()
					});
					apy[token.symbol] = 0n;
				}
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

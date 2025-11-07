import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { getcyFXRPwFLRPrice } from './cyFXRPwFLRQuote';
import { ONE, SUBGRAPH_URL } from '$lib/constants';
import { calculateRewardsPools } from './calculateRewardsPools';
import type { GlobalStats } from '$lib/types';

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
	const response = await fetch(SUBGRAPH_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: Stats
		})
	});
	const data: StatsQuery = (await response.json()).data;

	const totalEligibleCysFLR = BigInt(data.eligibleTotals?.totalEligibleCysFLR ?? 0);
	const totalEligibleCyWETH = BigInt(data.eligibleTotals?.totalEligibleCyWETH ?? 0);
	const totalEligibleCyFXRP = BigInt(data.eligibleTotals?.totalEligibleCyFXRP ?? 0);
	const totalEligibleSum = BigInt(data.eligibleTotals?.totalEligibleSum ?? 0);
	const eligibleHolders = (data.accounts ?? []).length;

	// Get prices in FLR terms
	// If price fetching fails (e.g., no liquidity pool), default to 1:1 price (1n * ONE)
	// This will result in APY being calculated but may be inaccurate if price fetch fails
	const cysFLRwFLRPrice = await getcysFLRwFLRPrice().catch((error) => {
		console.error('Failed to fetch cysFLR/wFLR price:', error);
		return ONE; // Default to 1:1 if price fetch fails
	});
	const cyWETHwFLRPrice = await getcyWETHwFLRPrice().catch((error) => {
		console.error('Failed to fetch cyWETH/wFLR price:', error);
		return ONE; // Default to 1:1 if price fetch fails
	});
	const cyFXRPwFLRPrice = await getcyFXRPwFLRPrice().catch((error) => {
		console.error('Failed to fetch cyFXRP/wFLR price:', error);
		return ONE; // Default to 1:1 if price fetch fails
	});

	if (!data.eligibleTotals) throw 'No eligible totals';

	const rewardsPools = calculateRewardsPools(data.eligibleTotals);

	// Calculate APY for cysFLR
	const cysFLRApy = calculateApy(rewardsPools.cysFlr, totalEligibleCysFLR, cysFLRwFLRPrice);

	// Calculate APY for cyWETH
	const cyWETHApy = calculateApy(rewardsPools.cyWeth, totalEligibleCyWETH, cyWETHwFLRPrice);

	// Calculate APY for cyFXRP
	const cyFXRPApy = calculateApy(rewardsPools.cyFxrp, totalEligibleCyFXRP, cyFXRPwFLRPrice);

	return {
		eligibleHolders,
		totalEligibleCysFLR,
		totalEligibleCyWETH,
		totalEligibleCyFXRP,
		totalEligibleSum,
		rewardsPools,
		cysFLRApy,
		cyWETHApy,
		cyFXRPApy
	};
}

import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { getcyFXRPwFLRPrice } from './cyFXRPwFLRQuote';
import { ONE } from '$lib/constants';
import { get } from 'svelte/store';
import { rewardsSubgraphUrl } from '$lib/stores';
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
	const rewardsSg = get(rewardsSubgraphUrl);
	const response = await fetch(rewardsSg, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: Stats
		})
	});
	const data: StatsQuery = (await response.json()).data;

	const eligibleTotals = data.eligibleTotals as {
		totalEligibleCysFLR?: string;
		totalEligibleCyWETH?: string;
		totalEligibleCyFXRP?: string;
		totalEligibleCyWBTC?: string;
		totalEligibleCycbBTC?: string;
		totalEligibleSum?: string;
	} | null;

	const totalEligibleCysFLR = BigInt(eligibleTotals?.totalEligibleCysFLR ?? 0);
	const totalEligibleCyWETH = BigInt(eligibleTotals?.totalEligibleCyWETH ?? 0);
	const totalEligibleCyFXRP = BigInt(eligibleTotals?.totalEligibleCyFXRP ?? 0);
	const totalEligibleCyWBTC = BigInt(eligibleTotals?.totalEligibleCyWBTC ?? 0);
	const totalEligibleCycbBTC = BigInt(eligibleTotals?.totalEligibleCycbBTC ?? 0);
	const totalEligibleSum = BigInt(eligibleTotals?.totalEligibleSum ?? 0);
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
	// TODO: Add price functions for cyWBTC and cycbBTC when available
	// For now, default to 1:1 price (ONE) which will calculate APY but may be inaccurate
	const cyWBTCwFLRPrice = ONE;
	const cycbBTCwFLRPrice = ONE;

	if (!eligibleTotals) throw 'No eligible totals';

	const rewardsPools = calculateRewardsPools(eligibleTotals);

	// Calculate APY for cysFLR
	const cysFLRApy = calculateApy(rewardsPools.cysFlr, totalEligibleCysFLR, cysFLRwFLRPrice);

	// Calculate APY for cyWETH
	const cyWETHApy = calculateApy(rewardsPools.cyWeth, totalEligibleCyWETH, cyWETHwFLRPrice);

	// Calculate APY for cyFXRP
	const cyFXRPApy = calculateApy(rewardsPools.cyFxrp, totalEligibleCyFXRP, cyFXRPwFLRPrice);

	// Calculate APY for cyWBTC
	const cyWBTCApy = calculateApy(rewardsPools.cyWbtc, totalEligibleCyWBTC, cyWBTCwFLRPrice);

	// Calculate APY for cycbBTC
	const cycbBTCApy = calculateApy(rewardsPools.cycbBtc, totalEligibleCycbBTC, cycbBTCwFLRPrice);

	return {
		eligibleHolders,
		totalEligibleCysFLR,
		totalEligibleCyWETH,
		totalEligibleCyFXRP,
		totalEligibleCyWBTC,
		totalEligibleCycbBTC,
		totalEligibleSum,
		rewardsPools,
		cysFLRApy,
		cyWETHApy,
		cyFXRPApy,
		cyWBTCApy,
		cycbBTCApy
	};
}

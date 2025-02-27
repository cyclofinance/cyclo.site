import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { ONE, SUBGRAPH_URL, TOTAL_REWARD } from '$lib/constants';
import { calculateRewardsPools } from './calculateRewardsPools';
import type { GlobalStats } from '$lib/types';

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
	const totalEligibleSum = BigInt(data.eligibleTotals?.totalEligibleSum ?? 0);
	const eligibleHolders = (data.accounts ?? []).length;

	console.log('Total Eligible Sum:', totalEligibleSum.toString());
	console.log('Monthly Rewards:', TOTAL_REWARD.toString());

	// Get prices in FLR terms
	const cysFLRwFLRPrice = await getcysFLRwFLRPrice();
	const cyWETHwFLRPrice = await getcyWETHwFLRPrice();

	console.log('cysFLR/wFLR Price:', cysFLRwFLRPrice.toString());
	console.log('cyWETH/wFLR Price:', cyWETHwFLRPrice.toString());

	if (!data.eligibleTotals) throw 'No eligible totals';

	const rewardsPools = calculateRewardsPools(data.eligibleTotals);

	// Calculate APY for cysFLR
	const cysFLRNumerator = rewardsPools.cysFlr * 12n * 100n * ONE * ONE;
	const cysFLRDenominator = BigInt(data.eligibleTotals.totalEligibleCysFLR) * cysFLRwFLRPrice;
	const cysFLRApy = cysFLRDenominator > 0n ? cysFLRNumerator / cysFLRDenominator : 0n;

	// Calculate APY for cyWETH
	const cyWETHNumerator = rewardsPools.cyWeth * 12n * 100n * ONE * ONE;
	const cyWETHDenominator = BigInt(data.eligibleTotals.totalEligibleCyWETH) * cyWETHwFLRPrice;
	const cyWETHApy = cyWETHDenominator > 0n ? cyWETHNumerator / cyWETHDenominator : 0n;

	console.log('Final APYs:');
	console.log('cysFLR:', cysFLRApy.toString());
	console.log('cyWETH:', cyWETHApy.toString());

	return {
		eligibleHolders,
		totalEligibleCysFLR,
		totalEligibleCyWETH,
		totalEligibleSum,
		rewardsPools,
		cysFLRApy,
		cyWETHApy
	};
}

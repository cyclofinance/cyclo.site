import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { SUBGRAPH_URL } from '$lib/constants';

export type GlobalStats = {
	eligibleHolders: number;
	totalEligibleCysFLR: bigint;
	totalEligibleCyWETH: bigint;
	totalEligibleSum: bigint;
	monthlyRewards: bigint;
	cysFLRApy: bigint;
	cyWETHApy: bigint;
};

const MONTHLY_REWARDS = 1_000_000n * 10n ** 18n; // 1M rFLR

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
	console.log('Monthly Rewards:', MONTHLY_REWARDS.toString());

	// Get prices in FLR terms
	const cysFLRwFLRPrice = await getcysFLRwFLRPrice();
	const cyWETHwFLRPrice = await getcyWETHwFLRPrice();

	console.log('cysFLR/wFLR Price:', cysFLRwFLRPrice.toString());
	console.log('cyWETH/wFLR Price:', cyWETHwFLRPrice.toString());

	// Calculate APY for cysFLR
	const cysFLRNumerator = MONTHLY_REWARDS * 12n * 100n * 10n ** 18n;
	const cysFLRDenominator = totalEligibleSum * cysFLRwFLRPrice;
	const cysFLRApy =
		cysFLRDenominator > 0n ? (cysFLRNumerator * 10n ** 18n) / cysFLRDenominator : 0n;

	// Calculate APY for cyWETH
	const cyWETHNumerator = MONTHLY_REWARDS * 12n * 100n * 10n ** 18n;
	const cyWETHDenominator = totalEligibleSum * cyWETHwFLRPrice;
	const cyWETHApy =
		cyWETHDenominator > 0n ? (cyWETHNumerator * 10n ** 18n) / cyWETHDenominator : 0n;

	console.log('Final APYs:');
	console.log('cysFLR:', cysFLRApy.toString());
	console.log('cyWETH:', cyWETHApy.toString());

	return {
		eligibleHolders,
		totalEligibleCysFLR,
		totalEligibleCyWETH,
		totalEligibleSum,
		monthlyRewards: MONTHLY_REWARDS,
		cysFLRApy,
		cyWETHApy
	};
}

import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { SUBGRAPH_URL } from '$lib/constants';

export type GlobalStats = {
	eligibleHolders: number;
	totalEligibleHoldings: bigint;
	monthlyRewards: bigint;
	currentApy: bigint;
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

	const totalEligibleHoldings = BigInt(data.trackingPeriods[0]?.totalApprovedTransfersIn ?? 0);
	const eligibleHolders = (data.trackingPeriodForAccounts ?? []).length;

	// APY calculation: (monthly reward / total holdings) * 12 * 100
	// first we have to get the FLR price of cysFLR
	const cysFLRwFLRPrice = await getcysFLRwFLRPrice();
	// now can denominate the total cysFLR holdings in FLR
	const totalEligibleHoldingsInFLR = (totalEligibleHoldings * cysFLRwFLRPrice) / 10n ** 18n;
	const currentApy = ((MONTHLY_REWARDS * 10n ** 18n) / totalEligibleHoldingsInFLR) * 12n * 100n;

	return {
		eligibleHolders,
		totalEligibleHoldings,
		monthlyRewards: MONTHLY_REWARDS,
		currentApy
	};
}

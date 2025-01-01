import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { formatEther } from 'ethers';

export type GlobalStats = {
	eligibleHolders: number;
	totalEligibleHoldings: number;
	monthlyRewards: number;
	currentApy: number;
};

const MONTHLY_REWARDS = 1_000_000; // 1M rFLR

export async function fetchStats(): Promise<GlobalStats> {
	const response = await fetch(
		'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-rewards/0.23/gn',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: Stats
			})
		}
	);
	const data: StatsQuery = (await response.json()).data;

	const totalEligibleHoldings = Number(
		formatEther(data.trackingPeriods[0]?.totalApprovedTransfersIn ?? '0')
	);
	const eligibleHolders = (data.trackingPeriodForAccounts ?? []).length;

	// APY calculation: (monthly reward / total holdings) * 12 * 100
	const currentApy = (MONTHLY_REWARDS / totalEligibleHoldings) * 12 * 100;

	return {
		eligibleHolders,
		totalEligibleHoldings,
		monthlyRewards: MONTHLY_REWARDS,
		currentApy
	};
}

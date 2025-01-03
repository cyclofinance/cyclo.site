import { type TopRewardsQuery } from '../../generated-graphql';
import TopRewards from '$lib/queries/top-rewards.graphql?raw';
import { formatEther } from 'ethers';
import { SUBGRAPH_URL } from '$lib/constants';

export type LeaderboardEntry = {
	account: string;
	netTransfers: string;
	percentage: number;
	proRataReward: number;
};

const TOTAL_REWARD = 1_000_000; // 1M rFLR

export async function fetchTopRewards(): Promise<LeaderboardEntry[]> {
	const response = await fetch(SUBGRAPH_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: TopRewards
		})
	});
	const data: TopRewardsQuery = (await response.json()).data;

	const totalNet = data.trackingPeriods[0]?.totalApprovedTransfersIn ?? '0';

	return (data.trackingPeriodForAccounts ?? []).slice(0, 50).map((entry) => {
		const accountNet = Number(formatEther(entry.netApprovedTransfersIn));
		const percentage = (accountNet / Number(formatEther(totalNet))) * 100;
		const proRataReward = percentage * (TOTAL_REWARD / 100);

		return {
			account: entry.account.id,
			netTransfers: entry.netApprovedTransfersIn,
			percentage,
			proRataReward
		};
	});
}

import { type TopAccountsQuery } from '../../generated-graphql';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';
import { formatEther } from 'ethers';
import { SUBGRAPH_URL } from '$lib/constants';

export type LeaderboardEntry = {
	account: string;
	netTransfers: {
		cysFLR: string;
		cyWETH: string;
	};
	percentage: number;
	proRataReward: number;
};

const TOTAL_REWARD = 1_000_000; // 1M rFLR

export async function fetchTopRewards(): Promise<LeaderboardEntry[]> {
	const response = await fetch(SUBGRAPH_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: TopAccounts
		})
	});
	const data: TopAccountsQuery = (await response.json()).data;

	return (data.accountsByCyBalance ?? []).map((account) => {
		const percentage = Number(account.eligibleShare ?? 0) * 100;
		return {
			account: account.id,
			netTransfers: {
				cysFLR: formatEther(account.cysFLRBalance),
				cyWETH: formatEther(account.cyWETHBalance)
			},
			percentage,
			proRataReward: percentage * (TOTAL_REWARD / 100)
		};
	});
}

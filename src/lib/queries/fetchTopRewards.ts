import { type TopAccountsQuery } from '../../generated-graphql';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';
import { get } from 'svelte/store';
import { rewardsSubgraphUrl } from '$lib/stores';
import type { LeaderboardEntry } from '$lib/types';
import { calculateShares } from './calculateShares';

export async function fetchTopRewards(): Promise<LeaderboardEntry[]> {
	const rewardsSg = get(rewardsSubgraphUrl);
	const response = await fetch(rewardsSg, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: TopAccounts
		})
	});
	const data: TopAccountsQuery = (await response.json()).data;

	const eligibleTotals = data.eligibleTotals as {
		totalEligibleCysFLR?: string;
		totalEligibleCyWETH?: string;
		totalEligibleCyFXRP?: string;
		totalEligibleCyWBTC?: string;
		totalEligibleCycbBTC?: string;
		totalEligibleSum?: string;
	} | null;

	if (!eligibleTotals) {
		throw 'No eligible totals';
	}

	const accountsWithShares = (data.accountsByCyBalance ?? []).map((account) => {
		const accountData = account as {
			id: string;
			cysFLRBalance: string;
			cyWETHBalance: string;
			cyFXRPBalance?: string;
			cyWBTCBalance?: string;
			cycbBTCBalance?: string;
			totalCyBalance: string;
		};

		const shares = calculateShares(accountData, eligibleTotals);

		return {
			account: accountData.id as `0x${string}`,
			eligibleBalances: {
				cysFLR: BigInt(accountData.cysFLRBalance),
				cyWETH: BigInt(accountData.cyWETHBalance),
				cyFXRP: BigInt(accountData.cyFXRPBalance || 0),
				cyWBTC: BigInt(accountData.cyWBTCBalance || 0),
				cycbBTC: BigInt(accountData.cycbBTCBalance || 0)
			},
			shares
		};
	});

	const sorted = accountsWithShares.sort((a, b) =>
		b.shares.totalRewards < a.shares.totalRewards
			? -1
			: b.shares.totalRewards == a.shares.totalRewards
				? 0
				: 1
	);

	return sorted.slice(0, 50);
}

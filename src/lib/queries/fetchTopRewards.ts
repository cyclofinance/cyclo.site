import { type TopAccountsQuery } from '../../generated-graphql';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';
import { SUBGRAPH_URL } from '$lib/constants';
import type { LeaderboardEntry } from '$lib/types';
import { calculateShares } from './calculateShares';

export async function fetchTopRewards(): Promise<LeaderboardEntry[]> {
	const response = await fetch(SUBGRAPH_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: TopAccounts
		})
	});
	const data: TopAccountsQuery = (await response.json()).data;

	const eligibleTotals = data.eligibleTotals;
	if (!eligibleTotals) throw 'No eligible totals';

	const accountsWithShares = (data.accountsByCyBalance ?? []).map((account) => {
		const shares = calculateShares(account, eligibleTotals);
		return {
			account: account.id,
			eligibleBalances: {
				cysFLR: BigInt(account.cysFLRBalance),
				cyWETH: BigInt(account.cyWETHBalance)
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

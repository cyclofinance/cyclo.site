import { type TopAccountsQuery } from '../../generated-graphql';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';
import type { LeaderboardEntry } from '$lib/types';
import { calculateShares } from './calculateShares';
import { extractBalancesFromVaults } from './vaultUtils';
import { get } from 'svelte/store';
import { selectedNetwork } from '$lib/stores';

export async function fetchTopRewards(): Promise<LeaderboardEntry[]> {
	const subgraphUrl = get(selectedNetwork).rewardsSubgraphUrl;
	const response = await fetch(subgraphUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: TopAccounts
		})
	});
	const data: TopAccountsQuery = (await response.json()).data;

	const eligibleTotals = data.eligibleTotals;
	if (!eligibleTotals) {
		throw 'No eligible totals';
	}

	const accountsWithShares = (data.accountsByCyBalance ?? []).map((account) => {
		const shares = calculateShares(account, eligibleTotals, data.cycloVaults);
		const balances = extractBalancesFromVaults(account.vaultBalances);
		return {
			account: account.id,
			eligibleBalances: balances,
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

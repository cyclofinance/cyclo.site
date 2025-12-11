import { type TopAccountsQuery } from '../../generated-graphql';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';
import type { LeaderboardEntry } from '$lib/types';
import { calculateShares } from './calculateShares';
import { get } from 'svelte/store';
import { tokens, selectedNetwork } from '$lib/stores';
import { isAddressEqual } from 'viem';

/**
 * Extract token balances from vaultBalances array
 */
function extractBalancesFromVaults(
	vaultBalances: NonNullable<TopAccountsQuery['accountsByCyBalance']>[0]['vaultBalances']
): Record<string, bigint> {
	const currentTokens = get(tokens);
	const balances: Record<string, bigint> = {};

	if (!vaultBalances) return balances;

	for (const vaultBalance of vaultBalances) {
		const vaultAddress = vaultBalance.vault?.address;
		if (!vaultAddress) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			balances[token.symbol] = BigInt(vaultBalance.balance || '0');
		}
	}

	// Ensure all tokens have a balance entry (even if 0)
	for (const token of currentTokens) {
		if (!(token.symbol in balances)) {
			balances[token.symbol] = 0n;
		}
	}

	return balances;
}

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
		const shares = calculateShares(account, eligibleTotals);
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

import { ONE } from '$lib/constants';
import type { Shares } from '$lib/types';
import type { AccountStatusQuery, TopAccountsQuery } from '../../generated-graphql';
import { calculateRewardsPools } from './calculateRewardsPools';
import { get } from 'svelte/store';
import { tokens } from '$lib/stores';
import { isAddressEqual } from 'viem';

type AccountWithVaults =
	| Omit<
			NonNullable<AccountStatusQuery['account']>,
			'transfersIn' | 'transfersOut' | 'liquidityChanges'
	  >
	| NonNullable<TopAccountsQuery['accountsByCyBalance']>[0];

/**
 * Extract token balances and total eligible from vaultBalances
 */
function extractVaultData(vaultBalances: AccountWithVaults['vaultBalances']): {
	balances: Record<string, bigint>;
	totals: Record<string, bigint>;
} {
	const currentTokens = get(tokens);
	const balances: Record<string, bigint> = {};
	const totals: Record<string, bigint> = {};

	if (!vaultBalances) {
		// Initialize with zeros for all tokens
		for (const token of currentTokens) {
			balances[token.symbol] = 0n;
			totals[token.symbol] = 0n;
		}
		return { balances, totals };
	}

	for (const vaultBalance of vaultBalances) {
		const vaultAddress = vaultBalance.vault?.address;
		if (!vaultAddress) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			const balance = BigInt(vaultBalance.balance || '0');
			// totalEligible may not be present in all query types (e.g., AccountStatusQuery)
			// It's only present in TopAccountsQuery and StatsQuery, not AccountStatusQuery
			const vault = vaultBalance.vault as { totalEligible?: string | null };
			const totalEligible = BigInt(vault?.totalEligible || '0');

			balances[token.symbol] = balance;
			totals[token.symbol] = totalEligible;
		}
	}

	// Ensure all tokens have entries (even if 0)
	for (const token of currentTokens) {
		if (!(token.symbol in balances)) {
			balances[token.symbol] = 0n;
		}
		if (!(token.symbol in totals)) {
			totals[token.symbol] = 0n;
		}
	}

	return { balances, totals };
}

export const calculateShares = (
	account: AccountWithVaults,
	eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']>
): Shares => {
	const currentTokens = get(tokens);

	// Initialize shares for all tokens
	const shares = {
		totalRewards: BigInt(0)
	} as Shares;
	for (const token of currentTokens) {
		shares[token.symbol] = { percentageShare: BigInt(0), rewardsAmount: BigInt(0) };
	}

	// Skip if no eligible totals
	if (!eligibleTotals || Object.keys(eligibleTotals).length === 0) {
		return shares;
	}

	// Extract balances and totals from vaultBalances
	const { balances, totals } = extractVaultData(account.vaultBalances);

	// Create eligibleTotals structure for calculateRewardsPools
	const totalEligibleSum = Object.values(totals).reduce((sum, val) => sum + val, 0n);
	const eligibleTotalsForPools = {
		...eligibleTotals,
		totalEligibleSum: totalEligibleSum.toString(),
		...Object.fromEntries(
			currentTokens.map((token) => [
				`totalEligible${token.symbol}`,
				totals[token.symbol]?.toString() || '0'
			])
		)
	};

	const rewardsPools = calculateRewardsPools(eligibleTotalsForPools, currentTokens);

	// Calculate shares for each token
	for (const token of currentTokens) {
		const balance = balances[token.symbol] || 0n;
		const total = totals[token.symbol] || 0n;
		const poolReward = rewardsPools[token.symbol] || 0n;

		// Calculate percentage share
		shares[token.symbol].percentageShare =
			balance > 0n && total > 0n ? (balance * ONE) / total : 0n;

		// Calculate rewards amount
		shares[token.symbol].rewardsAmount = (shares[token.symbol].percentageShare * poolReward) / ONE;

		// Add to total rewards
		shares.totalRewards += shares[token.symbol].rewardsAmount;
	}

	return shares;
};

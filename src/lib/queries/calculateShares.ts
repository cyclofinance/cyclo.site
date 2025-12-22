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
 * Aggregate total eligible amounts from cycloVaults by token symbol
 */
function aggregateTotalEligibleFromVaults(
	cycloVaults?: AccountStatusQuery['cycloVaults']
): Record<string, bigint> {
	const currentTokens = get(tokens);
	const totals: Record<string, bigint> = {};

	if (!cycloVaults) {
		// Initialize with zeros for all tokens
		for (const token of currentTokens) {
			totals[token.symbol] = 0n;
		}
		return totals;
	}

	// Aggregate totals from cycloVaults by token symbol
	for (const vault of cycloVaults) {
		const vaultAddress = vault?.address;
		const totalEligible = BigInt(vault?.totalEligible || '0');

		if (!vaultAddress || totalEligible === 0n) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			if (!(token.symbol in totals)) {
				totals[token.symbol] = 0n;
			}
			totals[token.symbol] += totalEligible;
		}
	}

	// Ensure all tokens have entries (even if 0)
	for (const token of currentTokens) {
		if (!(token.symbol in totals)) {
			totals[token.symbol] = 0n;
		}
	}

	return totals;
}

/**
 * Extract token balances from vaultBalances
 */
function extractBalances(
	vaultBalances: AccountWithVaults['vaultBalances']
): Record<string, bigint> {
	const currentTokens = get(tokens);
	const balances: Record<string, bigint> = {};

	if (!vaultBalances) {
		// Initialize with zeros for all tokens
		for (const token of currentTokens) {
			balances[token.symbol] = 0n;
		}
		return balances;
	}

	for (const vaultBalance of vaultBalances) {
		const vaultAddress = vaultBalance.vault?.address;
		if (!vaultAddress) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			const balance = BigInt(vaultBalance.balance || '0');
			balances[token.symbol] = balance;
		}
	}

	// Ensure all tokens have entries (even if 0)
	for (const token of currentTokens) {
		if (!(token.symbol in balances)) {
			balances[token.symbol] = 0n;
		}
	}

	return balances;
}

export const calculateShares = (
	account: AccountWithVaults,
	eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']>,
	cycloVaults?: AccountStatusQuery['cycloVaults']
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

	// Extract account balances from vaultBalances
	const balances = extractBalances(account.vaultBalances);

	// Aggregate total eligible amounts from cycloVaults (same as fetchStats does)
	const totals = aggregateTotalEligibleFromVaults(cycloVaults);

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

		// Calculate percentage share (same logic as old code: balance / totalEligible)
		shares[token.symbol].percentageShare =
			balance > 0n && total > 0n ? (balance * ONE) / total : 0n;

		// Calculate rewards amount
		shares[token.symbol].rewardsAmount = (shares[token.symbol].percentageShare * poolReward) / ONE;

		// Add to total rewards
		shares.totalRewards += shares[token.symbol].rewardsAmount;
	}

	return shares;
};

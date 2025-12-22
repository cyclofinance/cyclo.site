import { ONE } from '$lib/constants';
import type { Shares } from '$lib/types';
import type { AccountStatusQuery, TopAccountsQuery } from '../../generated-graphql';
import { calculateRewardsPools } from './calculateRewardsPools';
import { aggregateTotalEligibleFromVaults, extractBalancesFromVaults } from './vaultUtils';
import { get } from 'svelte/store';
import { tokens } from '$lib/stores';

type AccountWithVaults =
	| Omit<
			NonNullable<AccountStatusQuery['account']>,
			'transfersIn' | 'transfersOut' | 'liquidityChanges'
	  >
	| NonNullable<TopAccountsQuery['accountsByCyBalance']>[0];

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
	const balances = extractBalancesFromVaults(account.vaultBalances);

	// Aggregate total eligible amounts from cycloVaults
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

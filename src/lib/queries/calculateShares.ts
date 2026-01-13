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

	// Calculate totalEligibleSum by normalizing all values to 18 decimals before summing
	// This is necessary because tokens have different decimal precisions (e.g., cyFXRP.ftso has 6 decimals)
	const totalEligibleSum = currentTokens.reduce((sum, token) => {
		const tokenTotal = totals[token.symbol] || 0n;
		if (tokenTotal > 0n) {
			// Normalize to 18 decimals: if token has fewer decimals, multiply by 10^(18 - token.decimals)
			if (token.decimals < 18) {
				const decimalDiff = 18 - token.decimals;
				return sum + tokenTotal * 10n ** BigInt(decimalDiff);
			} else if (token.decimals === 18) {
				return sum + tokenTotal;
			} else {
				// If token has more than 18 decimals, divide (shouldn't happen but handle it)
				const decimalDiff = token.decimals - 18;
				return sum + tokenTotal / 10n ** BigInt(decimalDiff);
			}
		}
		return sum;
	}, 0n);

	// Create eligibleTotals structure for calculateRewardsPools
	// Normalize all individual token totals to 18 decimals for consistent comparison
	const eligibleTotalsForPools = {
		...eligibleTotals,
		totalEligibleSum: totalEligibleSum.toString(),
		totalEligibleSumSnapshot: totalEligibleSum.toString(), // Use our normalized sum
		...Object.fromEntries(
			currentTokens.map((token) => {
				const tokenTotal = totals[token.symbol] || 0n;
				let normalizedTotal = tokenTotal;

				// Normalize to 18 decimals for consistent comparison
				if (token.decimals < 18 && tokenTotal > 0n) {
					const decimalDiff = 18 - token.decimals;
					normalizedTotal = tokenTotal * 10n ** BigInt(decimalDiff);
				} else if (token.decimals > 18 && tokenTotal > 0n) {
					const decimalDiff = token.decimals - 18;
					normalizedTotal = tokenTotal / 10n ** BigInt(decimalDiff);
				}

				return [`totalEligible${token.symbol}`, normalizedTotal.toString()];
			})
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

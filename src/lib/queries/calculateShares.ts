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
function extractVaultData(
	vaultBalances: AccountWithVaults['vaultBalances']
): {
	balances: { cysFLR: bigint; cyWETH: bigint };
	totals: { cysFLR: bigint; cyWETH: bigint };
} {
	const currentTokens = get(tokens);
	const balances = { cysFLR: 0n, cyWETH: 0n };
	const totals = { cysFLR: 0n, cyWETH: 0n };

	if (!vaultBalances) return { balances, totals };

	for (const vaultBalance of vaultBalances) {
		const vaultAddress = vaultBalance.vault?.address;
		if (!vaultAddress) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			const balance = BigInt(vaultBalance.balance || '0');
			// totalEligible may not be present in all query types (e.g., AccountStatusQuery)
			// It's only present in TopAccountsQuery and StatsQuery, not AccountStatusQuery
			const vault = vaultBalance.vault as { totalEligible?: any };
			const totalEligible = BigInt(vault?.totalEligible || '0');

			if (token.symbol === 'cysFLR') {
				balances.cysFLR = balance;
				totals.cysFLR = totalEligible;
			} else if (token.symbol === 'cyWETH') {
				balances.cyWETH = balance;
				totals.cyWETH = totalEligible;
			}
		}
	}

	return { balances, totals };
}

export const calculateShares = (
	account: AccountWithVaults,
	eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']>
): Shares => {
	// Calculate share for each token
	const shares: Shares = {
		cysFLR: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		cyWETH: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		totalRewards: BigInt(0)
	};

	// Skip if no eligible totals
	if (!eligibleTotals || Object.keys(eligibleTotals).length === 0) {
		return shares;
	}

	// Extract balances and totals from vaultBalances
	const { balances, totals } = extractVaultData(account.vaultBalances);

	// Create eligibleTotals structure for calculateRewardsPools
	const eligibleTotalsForPools = {
		...eligibleTotals,
		totalEligibleCysFLR: totals.cysFLR.toString(),
		totalEligibleCyWETH: totals.cyWETH.toString(),
		totalEligibleSum: (totals.cysFLR + totals.cyWETH).toString()
	};

	const rewardsPools = calculateRewardsPools(eligibleTotalsForPools);

	// cysFLR shares
	shares.cysFLR.percentageShare =
		balances.cysFLR > 0n && totals.cysFLR > 0n
			? (balances.cysFLR * ONE) / totals.cysFLR
			: 0n;

	// cyWETH shares
	shares.cyWETH.percentageShare =
		balances.cyWETH > 0n && totals.cyWETH > 0n
			? (balances.cyWETH * ONE) / totals.cyWETH
			: 0n;

	// cysFLR rewards
	shares.cysFLR.rewardsAmount = (shares.cysFLR.percentageShare * rewardsPools.cysFlr) / ONE;

	// cyWETH rewards
	shares.cyWETH.rewardsAmount = (shares.cyWETH.percentageShare * rewardsPools.cyWeth) / ONE;

	shares.totalRewards = shares.cysFLR.rewardsAmount + shares.cyWETH.rewardsAmount;

	return shares;
};

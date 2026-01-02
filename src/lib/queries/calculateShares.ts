import { ONE } from '$lib/constants';
import type { Shares } from '$lib/types';
import type { AccountStatusQuery } from '../../generated-graphql';
import { calculateRewardsPools } from './calculateRewardsPools';

export const calculateShares = (
	account: Omit<
		NonNullable<AccountStatusQuery['account']>,
		'transfersIn' | 'transfersOut' | 'liquidityChanges'
	>,
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

	const rewardsPools = calculateRewardsPools(eligibleTotals);

	// Balances
	const cysFLRBalance = BigInt(account.cysFLRBalance);
	const cyWETHBalance = BigInt(account.cyWETHBalance);

	// cysFLR shares
	shares.cysFLR.percentageShare =
		cysFLRBalance > 0 ? (cysFLRBalance * ONE) / BigInt(eligibleTotals.totalEligibleCysFLR) : 0n;

	// cyWETH shares
	shares.cyWETH.percentageShare =
		cyWETHBalance > 0 ? (cyWETHBalance * ONE) / BigInt(eligibleTotals.totalEligibleCyWETH) : 0n;

	// cysFLR rewards
	shares.cysFLR.rewardsAmount = (shares.cysFLR.percentageShare * rewardsPools.cysFlr) / ONE;

	// cyWETH rewards
	shares.cyWETH.rewardsAmount = (shares.cyWETH.percentageShare * rewardsPools.cyWeth) / ONE;

	shares.totalRewards = shares.cysFLR.rewardsAmount + shares.cyWETH.rewardsAmount;

	return shares;
};

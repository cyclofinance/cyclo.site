import { ONE, TOTAL_REWARD } from '$lib/constants';
import type { AccountStatusQuery } from '../../generated-graphql';

export const calculateShares = (
	account: AccountStatusQuery['account'],
	eligibleTotals: AccountStatusQuery['eligibleTotals']
): Shares => {
	// Skip if no eligible totals
	if (!eligibleTotals || Object.keys(eligibleTotals).length === 0) {
		return {
			cysFLR: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
			cyWETH: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) }
		};
	}

	const rewardsPools = {
		cysFlr:
			(BigInt(eligibleTotals.totalEligibleCysFLR) / BigInt(eligibleTotals.totalEligibleSum)) *
			BigInt(TOTAL_REWARD),
		cyWeth:
			(BigInt(eligibleTotals.totalEligibleCyWETH) / BigInt(eligibleTotals.totalEligibleSum)) *
			BigInt(TOTAL_REWARD)
	};

	// Calculate share for each token
	const shares: Shares = {
		cysFLR: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		cyWETH: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) }
	};

	// cysFLR shares
	shares.cysFLR.percentageShare =
		(account?.cysFLRBalance * ONE) / eligibleTotals.totalEligibleCysFLR;

	// cyWETH shares
	shares.cyWETH.percentageShare =
		(account?.cyWETHBalance * ONE) / eligibleTotals.totalEligibleCyWETH;

	// cysFLR rewards
	shares.cysFLR.rewardsAmount = (shares.cysFLR.percentageShare * rewardsPools.cysFlr) / ONE;

	// cyWETH rewards
	shares.cyWETH.rewardsAmount = (shares.cyWETH.percentageShare * rewardsPools.cyWeth) / ONE;

	return shares;
};

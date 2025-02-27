import { ONE, TOTAL_REWARD } from '$lib/constants';
import type { RewardsPools } from '$lib/types';
import type { AccountStatusQuery } from '../../generated-graphql';

export const calculateRewardsPools = (
	eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']>
): RewardsPools => {
	const cysFLRInverseFraction =
		(BigInt(eligibleTotals.totalEligibleSum) * ONE) / BigInt(eligibleTotals.totalEligibleCysFLR);
	const cyWETHInverseFraction =
		(BigInt(eligibleTotals.totalEligibleSum) * ONE) / BigInt(eligibleTotals.totalEligibleCyWETH);

	const sum = cysFLRInverseFraction + cyWETHInverseFraction;

	const cysFlr = (cysFLRInverseFraction * TOTAL_REWARD) / sum;
	const cyWeth = (cyWETHInverseFraction * TOTAL_REWARD) / sum;

	return {
		cysFlr,
		cyWeth
	};
};

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
	const cyFXRPInverseFraction =
		(BigInt(eligibleTotals.totalEligibleSum) * ONE) / BigInt((eligibleTotals as any).totalEligibleCyFXRP || 1);

	const sum = cysFLRInverseFraction + cyWETHInverseFraction + cyFXRPInverseFraction;

	const cysFlr = (cysFLRInverseFraction * TOTAL_REWARD) / sum;
	const cyWeth = (cyWETHInverseFraction * TOTAL_REWARD) / sum;
	const cyFxrp = (cyFXRPInverseFraction * TOTAL_REWARD) / sum;

	return {
		cysFlr,
		cyWeth,
		cyFxrp
	};
};

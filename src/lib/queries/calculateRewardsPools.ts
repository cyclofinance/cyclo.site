import { ONE, TOTAL_REWARD } from '$lib/constants';
import type { RewardsPools } from '$lib/types';
import type { AccountStatusQuery } from '../../generated-graphql';

export const calculateRewardsPools = (
	eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']>
): RewardsPools => {
	const totalEligibleCysFLR = BigInt(eligibleTotals.totalEligibleCysFLR || 0);
	const totalEligibleCyWETH = BigInt(eligibleTotals.totalEligibleCyWETH || 0);
	const totalEligibleCyFXRP = BigInt((eligibleTotals as any).totalEligibleCyFXRP || 0);
	const totalEligibleSum = BigInt(eligibleTotals.totalEligibleSum || 0);

	// Return zero rewards if no eligible totals
	if (totalEligibleSum === 0n) {
		return {
			cysFlr: 0n,
			cyWeth: 0n,
			cyFxrp: 0n
		};
	}

	const cysFLRInverseFraction = totalEligibleCysFLR > 0n
		? (totalEligibleSum * ONE) / totalEligibleCysFLR
		: 0n;
	const cyWETHInverseFraction = totalEligibleCyWETH > 0n
		? (totalEligibleSum * ONE) / totalEligibleCyWETH
		: 0n;
	const cyFXRPInverseFraction = totalEligibleCyFXRP > 0n
		? (totalEligibleSum * ONE) / totalEligibleCyFXRP
		: 0n;

	const sum = cysFLRInverseFraction + cyWETHInverseFraction + cyFXRPInverseFraction;

	// Return zero rewards if sum is zero (no eligible tokens)
	if (sum === 0n) {
		return {
			cysFlr: 0n,
			cyWeth: 0n,
			cyFxrp: 0n
		};
	}

	const cysFlr = (cysFLRInverseFraction * TOTAL_REWARD) / sum;
	const cyWeth = (cyWETHInverseFraction * TOTAL_REWARD) / sum;
	const cyFxrp = (cyFXRPInverseFraction * TOTAL_REWARD) / sum;

	return {
		cysFlr,
		cyWeth,
		cyFxrp
	};
};

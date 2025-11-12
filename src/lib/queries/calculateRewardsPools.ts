import { ONE, TOTAL_REWARD } from '$lib/constants';
import type { RewardsPools } from '$lib/types';
import type { AccountStatusQuery } from '../../generated-graphql';

type EligibleTotals = {
	totalEligibleCysFLR?: string | number;
	totalEligibleCyWETH?: string | number;
	totalEligibleCyFXRP?: string | number;
	totalEligibleCyWBTC?: string | number;
	totalEligibleCycbBTC?: string | number;
	totalEligibleSum?: string | number;
};

export const calculateRewardsPools = (
	eligibleTotals: EligibleTotals | NonNullable<AccountStatusQuery['eligibleTotals']>
): RewardsPools => {
	const totals = eligibleTotals as EligibleTotals;
	const totalEligibleCysFLR = BigInt(totals.totalEligibleCysFLR || 0);
	const totalEligibleCyWETH = BigInt(totals.totalEligibleCyWETH || 0);
	const totalEligibleCyFXRP = BigInt(totals.totalEligibleCyFXRP || 0);
	const totalEligibleCyWBTC = BigInt(totals.totalEligibleCyWBTC || 0);
	const totalEligibleCycbBTC = BigInt(totals.totalEligibleCycbBTC || 0);
	const totalEligibleSum = BigInt(totals.totalEligibleSum || 0);

	// Return zero rewards if no eligible totals
	if (totalEligibleSum === 0n) {
		return {
			cysFlr: 0n,
			cyWeth: 0n,
			cyFxrp: 0n,
			cyWbtc: 0n,
			cycbBtc: 0n
		};
	}

	const cysFLRInverseFraction =
		totalEligibleCysFLR > 0n ? (totalEligibleSum * ONE) / totalEligibleCysFLR : 0n;
	const cyWETHInverseFraction =
		totalEligibleCyWETH > 0n ? (totalEligibleSum * ONE) / totalEligibleCyWETH : 0n;
	const cyFXRPInverseFraction =
		totalEligibleCyFXRP > 0n ? (totalEligibleSum * ONE) / totalEligibleCyFXRP : 0n;
	const cyWBTCInverseFraction =
		totalEligibleCyWBTC > 0n ? (totalEligibleSum * ONE) / totalEligibleCyWBTC : 0n;
	const cycbBTCInverseFraction =
		totalEligibleCycbBTC > 0n ? (totalEligibleSum * ONE) / totalEligibleCycbBTC : 0n;

	const sum =
		cysFLRInverseFraction +
		cyWETHInverseFraction +
		cyFXRPInverseFraction +
		cyWBTCInverseFraction +
		cycbBTCInverseFraction;

	// Return zero rewards if sum is zero (no eligible tokens)
	if (sum === 0n) {
		return {
			cysFlr: 0n,
			cyWeth: 0n,
			cyFxrp: 0n,
			cyWbtc: 0n,
			cycbBtc: 0n
		};
	}

	const cysFlr = (cysFLRInverseFraction * TOTAL_REWARD) / sum;
	const cyWeth = (cyWETHInverseFraction * TOTAL_REWARD) / sum;
	const cyFxrp = (cyFXRPInverseFraction * TOTAL_REWARD) / sum;
	const cyWbtc = (cyWBTCInverseFraction * TOTAL_REWARD) / sum;
	const cycbBtc = (cycbBTCInverseFraction * TOTAL_REWARD) / sum;

	return {
		cysFlr,
		cyWeth,
		cyFxrp,
		cyWbtc,
		cycbBtc
	};
};

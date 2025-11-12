import { ONE } from '$lib/constants';
import type { Shares } from '$lib/types';
import type { AccountStatusQuery } from '../../generated-graphql';
import { calculateRewardsPools } from './calculateRewardsPools';

type AccountData = {
	cysFLRBalance?: string | number;
	cyWETHBalance?: string | number;
	cyFXRPBalance?: string | number;
	cyWBTCBalance?: string | number;
	cycbBTCBalance?: string | number;
	totalCyBalance?: string | number;
};

type EligibleTotals = {
	totalEligibleCysFLR?: string | number;
	totalEligibleCyWETH?: string | number;
	totalEligibleCyFXRP?: string | number;
	totalEligibleCyWBTC?: string | number;
	totalEligibleCycbBTC?: string | number;
	totalEligibleSum?: string | number;
};

export const calculateShares = (
	account:
		| AccountData
		| Omit<NonNullable<AccountStatusQuery['account']>, 'transfersIn' | 'transfersOut'>,
	eligibleTotals: EligibleTotals | NonNullable<AccountStatusQuery['eligibleTotals']>
): Shares => {
	// Calculate share for each token
	const shares: Shares = {
		cysFLR: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		cyWETH: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		cyFXRP: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		cyWBTC: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		cycbBTC: { percentageShare: BigInt(0), rewardsAmount: BigInt(0) },
		totalRewards: BigInt(0)
	};

	// Skip if no eligible totals
	if (!eligibleTotals || Object.keys(eligibleTotals).length === 0) {
		return shares;
	}

	const rewardsPools = calculateRewardsPools(eligibleTotals);

	// Balances
	const accountData = account as AccountData;
	const cysFLRBalance = BigInt(accountData.cysFLRBalance || 0);
	const cyWETHBalance = BigInt(accountData.cyWETHBalance || 0);
	const cyFXRPBalance = BigInt(accountData.cyFXRPBalance || 0);
	const cyWBTCBalance = BigInt(accountData.cyWBTCBalance || 0);
	const cycbBTCBalance = BigInt(accountData.cycbBTCBalance || 0);

	// cysFLR shares
	const eligibleData = eligibleTotals as EligibleTotals;
	const totalEligibleCysFLR = BigInt(eligibleData.totalEligibleCysFLR || 0);
	shares.cysFLR.percentageShare =
		cysFLRBalance > 0n && totalEligibleCysFLR > 0n
			? (cysFLRBalance * ONE) / totalEligibleCysFLR
			: 0n;

	// cyWETH shares
	const totalEligibleCyWETH = BigInt(eligibleData.totalEligibleCyWETH || 0);
	shares.cyWETH.percentageShare =
		cyWETHBalance > 0n && totalEligibleCyWETH > 0n
			? (cyWETHBalance * ONE) / totalEligibleCyWETH
			: 0n;

	// cyFXRP shares
	const totalEligibleCyFXRP = BigInt(eligibleData.totalEligibleCyFXRP || 0);
	shares.cyFXRP.percentageShare =
		cyFXRPBalance > 0n && totalEligibleCyFXRP > 0n
			? (cyFXRPBalance * ONE) / totalEligibleCyFXRP
			: 0n;

	// cyWBTC shares
	const totalEligibleCyWBTC = BigInt(eligibleData.totalEligibleCyWBTC || 0);
	shares.cyWBTC.percentageShare =
		cyWBTCBalance > 0n && totalEligibleCyWBTC > 0n
			? (cyWBTCBalance * ONE) / totalEligibleCyWBTC
			: 0n;

	// cycbBTC shares
	const totalEligibleCycbBTC = BigInt(eligibleData.totalEligibleCycbBTC || 0);
	shares.cycbBTC.percentageShare =
		cycbBTCBalance > 0n && totalEligibleCycbBTC > 0n
			? (cycbBTCBalance * ONE) / totalEligibleCycbBTC
			: 0n;

	// cysFLR rewards
	shares.cysFLR.rewardsAmount = (shares.cysFLR.percentageShare * rewardsPools.cysFlr) / ONE;

	// cyWETH rewards
	shares.cyWETH.rewardsAmount = (shares.cyWETH.percentageShare * rewardsPools.cyWeth) / ONE;

	// cyFXRP rewards
	shares.cyFXRP.rewardsAmount = (shares.cyFXRP.percentageShare * rewardsPools.cyFxrp) / ONE;

	// cyWBTC rewards
	shares.cyWBTC.rewardsAmount = (shares.cyWBTC.percentageShare * rewardsPools.cyWbtc) / ONE;

	// cycbBTC rewards
	shares.cycbBTC.rewardsAmount = (shares.cycbBTC.percentageShare * rewardsPools.cycbBtc) / ONE;

	shares.totalRewards =
		shares.cysFLR.rewardsAmount +
		shares.cyWETH.rewardsAmount +
		shares.cyFXRP.rewardsAmount +
		shares.cyWBTC.rewardsAmount +
		shares.cycbBTC.rewardsAmount;

	return shares;
};

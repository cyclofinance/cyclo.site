import { describe, it, expect } from 'vitest';
import { calculateShares } from './calculateShares';
import type { AccountStatusQuery } from '../../generated-graphql';
import { ONE, TOTAL_REWARD } from '$lib/constants';

const account = {
	cysFLRBalance: ONE.toString(),
	cyWETHBalance: (ONE / 2n).toString(),
	cyFXRPBalance: '0',
	cyLINKBalance: '0',
	cyDOTBalance: '0',
	cyUNIBalance: '0',
	cyPEPEBalance: '0',
	cyENABalance: '0',
	cyARBBalance: '0',
	cywstETHBalance: '0',
	cyXAUt0Balance: '0',
	cyPYTHBalance: '0',
	totalCyBalance: (ONE + ONE / 2n).toString()
};

const eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']> = {
	__typename: 'EligibleTotals',
	id: 'SINGLETON',
	totalEligibleCyWETH: ONE.toString(),
	totalEligibleCysFLR: (ONE * 2n).toString(),
	totalEligibleCyFXRP: '0',
	totalEligibleCyLINK: '0',
	totalEligibleCyDOT: '0',
	totalEligibleCyUNI: '0',
	totalEligibleCyPEPE: '0',
	totalEligibleCyENA: '0',
	totalEligibleCyARB: '0',
	totalEligibleCywstETH: '0',
	totalEligibleCyXAUt0: '0',
	totalEligibleCyPYTH: '0',
	totalEligibleSum: (ONE + ONE * 2n).toString()
};

describe('calculateShares', () => {
	it('calculates the right shares', () => {
		const shares = calculateShares(account, eligibleTotals);

		// this account has 50% of the cysFLR and 50% of the cyWETH
		expect(shares.cysFLR.percentageShare).toBe(ONE / 2n);
		expect(shares.cyWETH.percentageShare).toBe(ONE / 2n);

		// the pools are 1/3 cysFLR and 2/3 cyWETH
		const cysFLRPool = TOTAL_REWARD / 3n;
		const cyWETHPool = (TOTAL_REWARD * 2n) / 3n;

		expect(shares.cysFLR.rewardsAmount).toBe(cysFLRPool / 2n);
		expect(shares.cyWETH.rewardsAmount).toBe(cyWETHPool / 2n);

		// total rewards should be the total reward
		expect(shares.totalRewards).toBe(cysFLRPool / 2n + cyWETHPool / 2n);
	});
});

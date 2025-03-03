import { describe, it, expect } from 'vitest';
import { calculateShares } from './calculateShares';
import type { AccountStatusQuery } from '../../generated-graphql';
import { ONE, TOTAL_REWARD } from '$lib/constants';

const account = {
	cysFLRBalance: ONE.toString(),
	cyWETHBalance: (ONE / 2n).toString(),
	totalCyBalance: (ONE + ONE / 2n).toString()
};

const eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']> = {
	__typename: 'EligibleTotals',
	id: 'SINGLETON',
	totalEligibleCyWETH: ONE.toString(),
	totalEligibleCysFLR: (ONE * 2n).toString(),
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

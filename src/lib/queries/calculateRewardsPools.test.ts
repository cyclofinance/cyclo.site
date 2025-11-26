import { describe, it, expect } from 'vitest';
import { calculateRewardsPools } from './calculateRewardsPools';
import type { AccountStatusQuery } from '../../generated-graphql';
import { TOTAL_REWARD } from '$lib/constants';

const eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']> = {
	__typename: 'EligibleTotals',
	id: 'SINGLETON',
	totalEligibleCyWETH: '1000000000000000000000',
	totalEligibleCysFLR: '2000000000000000000000',
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
	totalEligibleSum: '3000000000000000000000'
};

describe('calculateRewardsPools', () => {
	it('calculates the right pool amounts according to the rewards rules', () => {
		const rewardsPools = calculateRewardsPools(eligibleTotals);

		//  cyWETH is 1/3 of the eligible tokens so should have 2/3 of the rewards
		//  cysFLR is 2/3 of the eligible tokens so should have 1/3 of the rewards
		const cysFlr = TOTAL_REWARD / 3n;
		const cyWeth = (TOTAL_REWARD * 2n) / 3n;

		expect(rewardsPools).toEqual({
			cysFlr,
			cyWeth,
			cyFxrp: 0n
		});
	});
});

import { describe, it, expect } from 'vitest';
import { calculateRewardsPools } from './calculateRewardsPools';
import type { AccountStatusQuery } from '../../generated-graphql';
import { TOTAL_REWARD } from '$lib/constants';
import type { CyToken } from '$lib/types';
import type { Hex } from 'viem';

const eligibleTotals = {
	__typename: 'EligibleTotals',
	id: 'SINGLETON',
	totalEligiblecyWETH: '1000000000000000000000',
	totalEligiblecysFLR: '2000000000000000000000',
	totalEligibleSum: '3000000000000000000000'
} as NonNullable<AccountStatusQuery['eligibleTotals']> & Record<string, string | undefined>;

const mockTokens: CyToken[] = [
	{
		name: 'cysFLR',
		symbol: 'cysFLR',
		decimals: 18,
		address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
		underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as Hex,
		underlyingSymbol: 'sFLR',
		receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' as Hex
	},
	{
		name: 'cyWETH',
		symbol: 'cyWETH',
		decimals: 18,
		address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
		underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex,
		underlyingSymbol: 'WETH',
		receiptAddress: '0xBE2615A0fcB54A49A1eB472be30d992599FE0968' as Hex
	}
];

describe('calculateRewardsPools', () => {
	it('calculates the right pool amounts according to the rewards rules', () => {
		const rewardsPools = calculateRewardsPools(eligibleTotals, mockTokens);

		//  cyWETH is 1/3 of the eligible tokens so should have 2/3 of the rewards
		//  cysFLR is 2/3 of the eligible tokens so should have 1/3 of the rewards
		const cysFlr = TOTAL_REWARD / 3n;
		const cyWeth = (TOTAL_REWARD * 2n) / 3n;

		expect(rewardsPools).toEqual({
			cysFLR: cysFlr,
			cyWETH: cyWeth
		});
	});
});

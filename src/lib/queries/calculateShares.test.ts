import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateShares } from './calculateShares';
import type { AccountStatusQuery } from '../../generated-graphql';
import { ONE, TOTAL_REWARD } from '$lib/constants';
import type { CyToken } from '$lib/types';
import type { Hex } from 'viem';

const { mockTokens } = vi.hoisted(() => {
	const tokens: CyToken[] = [
		{
			name: 'cysFLR',
			symbol: 'cysFLR',
			decimals: 18,
			address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
			underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as Hex,
			underlyingSymbol: 'sFLR',
			receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' as Hex,
			chainId: 14,
			networkName: 'Flare'
		},
		{
			name: 'cyWETH',
			symbol: 'cyWETH',
			decimals: 18,
			address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
			underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex,
			underlyingSymbol: 'WETH',
			receiptAddress: '0xBE2615A0fcB54A49A1eB472be30d992599FE0968' as Hex,
			chainId: 14,
			networkName: 'Flare'
		}
	];
	return { mockTokens: tokens };
});

vi.mock('$lib/stores', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		tokens: writable(mockTokens)
	};
});

const account = {
	id: '0x1234567890abcdef',
	vaultBalances: [
		{
			balance: ONE.toString(),
			vault: {
				address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex, // cysFLR address
				totalEligible: (ONE * 2n).toString() // total eligible for cysFLR
			}
		},
		{
			balance: (ONE / 2n).toString(),
			vault: {
				address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex, // cyWETH address
				totalEligible: ONE.toString() // total eligible for cyWETH
			}
		}
	],
	totalCyBalance: (ONE + ONE / 2n).toString()
};

const eligibleTotals = {
	__typename: 'EligibleTotals',
	id: 'SINGLETON',
	totalEligibleSum: (ONE + ONE * 2n).toString()
} as NonNullable<AccountStatusQuery['eligibleTotals']> & Record<string, string | undefined>;

const cycloVaults = [
	{
		address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex, // cysFLR address
		totalEligible: (ONE * 2n).toString() // total eligible for cysFLR
	},
	{
		address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex, // cyWETH address
		totalEligible: ONE.toString() // total eligible for cyWETH
	}
] as AccountStatusQuery['cycloVaults'];

describe('calculateShares', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calculates the right shares', () => {
		const shares = calculateShares(account, eligibleTotals, cycloVaults);

		// this account has 50% of the cysFLR and 50% of the cyWETH
		expect(shares.cysFLR.percentageShare).toBe(ONE / 2n);
		expect(shares.cyWETH.percentageShare).toBe(ONE / 2n);

		// the pools are 1/3 cysFLR and 2/3 cyWETH (inverse fractions)
		const cysFLRPool = TOTAL_REWARD / 3n;
		const cyWETHPool = (TOTAL_REWARD * 2n) / 3n;

		expect(shares.cysFLR.rewardsAmount).toBe(cysFLRPool / 2n);
		expect(shares.cyWETH.rewardsAmount).toBe(cyWETHPool / 2n);

		// total rewards should be the sum
		expect(shares.totalRewards).toBe(cysFLRPool / 2n + cyWETHPool / 2n);
	});
});

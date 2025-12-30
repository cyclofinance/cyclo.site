import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateApy, fetchStats } from './fetchStats';
import { ONE } from '$lib/constants';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { calculateRewardsPools } from './calculateRewardsPools';
import type { CyToken } from '$lib/types';
import type { Hex } from 'viem';

const { mockTokens, MOCKED_SUBGRAPH_URL } = vi.hoisted(() => {
	const MOCKED_SUBGRAPH_URL = 'http://mocked-subgraph-url';
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
			networkName: 'Flare',
			active: true
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
			networkName: 'Flare',
			active: true
		}
	];
	return { mockTokens: tokens, MOCKED_SUBGRAPH_URL };
});

vi.mock('$lib/constants', () => ({
	TOTAL_REWARD: 1000000000000000000000n,
	ONE: 1000000000000000000000n
}));

vi.mock('$lib/stores', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		tokens: writable(mockTokens),
		selectedNetwork: writable({ rewardsSubgraphUrl: MOCKED_SUBGRAPH_URL })
	};
});

vi.mock('./cysFLRwFLRQuote', () => ({
	getcysFLRwFLRPrice: vi.fn()
}));

vi.mock('./cyWETHwFLRQuote', () => ({
	getcyWETHwFLRPrice: vi.fn()
}));

global.fetch = vi.fn();

describe('calculateApy', () => {
	it('calculates apy correctly', () => {
		// if we have 500,000 rFLR in the pool, 5000 eligible cysFLR, and the price of 1 cysFLR is 50 FLR
		// every cysFLR purchased will net you 500,000/5000 = 100 rFLR
		// that cysFLR will cost you 50 FLR
		// so your return is 1000/50 = 2x your investment
		// over 12 months is 24x your investment
		const poolAmount = ONE * 500_000n;
		const totalEligible = ONE * 5000n;
		const price = ONE * 50n;
		const apy = calculateApy(poolAmount, totalEligible, price);
		expect(apy).toBe(2400n * ONE); // 2400%
	});

	it('returns 0 if either the price or the total eligible is 0', () => {
		const apy = calculateApy(ONE * 1000n, 0n, ONE * 50n);
		expect(apy).toBe(0n);
		const apy2 = calculateApy(ONE * 1000n, ONE * 5000n, 0n);
		expect(apy2).toBe(0n);
	});
});

describe('fetchStats', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and calculates stats correctly', async () => {
		// Use values that divide evenly by 96 to avoid rounding errors
		const totalEligibleCysFLR = BigInt('1920000000000000000000'); // 96 * 20000000000000000000
		const totalEligibleCyWETH = BigInt('960000000000000000000'); // 96 * 10000000000000000000
		const totalEligibleSum = totalEligibleCysFLR + totalEligibleCyWETH;

		const mockResponse = {
			data: {
				eligibleTotals: {
					id: 'SINGLETON',
					totalEligibleSum: totalEligibleSum.toString(),
					totalEligibleSumSnapshot: totalEligibleSum.toString()
				},
				cycloVaults: [
					{
						address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex, // cysFLR
						totalEligible: totalEligibleCysFLR.toString(),
						totalEligibleSnapshot: totalEligibleCysFLR.toString(),
					},
					{
						address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex, // cyWETH
						totalEligible: totalEligibleCyWETH.toString(),
						totalEligibleSnapshot: totalEligibleCyWETH.toString()
					}
				],
				accounts: Array(96).fill({
					id: '0x1234567890abcdef'
				})
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockResponse
		} as Response);

		// Mock price quotes
		vi.mocked(getcysFLRwFLRPrice).mockResolvedValueOnce(BigInt('500000000000000000')); // 0.5 FLR
		vi.mocked(getcyWETHwFLRPrice).mockResolvedValueOnce(BigInt('1000000000000000000')); // 1 FLR

		const result = await fetchStats();

		const eligibleTotalsForPools = {
			...mockResponse.data.eligibleTotals,
			totalEligibleSum: totalEligibleSum.toString(),
			totalEligiblecysFLR: totalEligibleCysFLR.toString(),
			totalEligiblecyWETH: totalEligibleCyWETH.toString()
		};
		const rewardsPools = calculateRewardsPools(eligibleTotalsForPools, mockTokens);

		expect(result).toEqual({
			eligibleHolders: 96,
			totalEligible: {
				cysFLR: totalEligibleCysFLR,
				cyWETH: totalEligibleCyWETH
			},
			totalEligibleSum,
			rewardsPools,
			apy: {
				cysFLR: calculateApy(
					rewardsPools.cysFLR,
					totalEligibleCysFLR,
					BigInt('500000000000000000')
				),
				cyWETH: calculateApy(
					rewardsPools.cyWETH,
					totalEligibleCyWETH,
					BigInt('1000000000000000000')
				)
			}
		});

		expect(fetch).toHaveBeenCalledWith(MOCKED_SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: Stats })
		});
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTopRewards } from './fetchTopRewards';
import { ONE } from '$lib/constants';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';
import { calculateShares } from './calculateShares';
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
	ONE: 1000000000000000000000n,
	TOTAL_REWARD: 1000000000000000000000n
}));

vi.mock('$lib/stores', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		tokens: writable(mockTokens),
		selectedNetwork: writable({ rewardsSubgraphUrl: MOCKED_SUBGRAPH_URL })
	};
});

global.fetch = vi.fn();

describe('fetchTopRewards', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and computes leaderboard entries correctly', async () => {
		const account1 = {
			id: '0x123',
			totalCyBalance: '2000000000000000000000',
			totalCyBalanceSnapshot: '3000000000000000000000',
			vaultBalances: [
				{
					balance: (ONE + 2n).toString(),
					balanceAvgSnapshot: ONE.toString(),
					vault: {
						address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex, // cysFLR
						totalEligible: '1000000000000000000000',
						totalEligibleSnapshot: '2000000000000000000000'
					}
				},
				{
					balance: ONE.toString(),
					balanceAvgSnapshot: (2n * ONE).toString(),
					vault: {
						address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex, // cyWETH
						totalEligible: '2000000000000000000000',
						totalEligibleSnapshot: '1000000000000000000000'
					}
				}
			]
		};

		const account2 = {
			id: '0x456',
			totalCyBalance: '1600000000000000000000',
			totalCyBalanceSnapshot: '1500000000000000000000',
			vaultBalances: [
				{
					balance: (ONE / 2n).toString(),
					balanceAvgSnapshot: (ONE / 2n).toString(),
					vault: {
						address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex, // cysFLR
						totalEligible: '1000000000000000000000',
						totalEligibleSnapshot: '2000000000000000000000'
					}
				},
				{
					balance: ONE.toString(),
					balanceAvgSnapshot: ONE.toString(),
					vault: {
						address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex, // cyWETH
						totalEligible: '1100000000000000000000',
						totalEligibleSnapshot: '1000000000000000000000'
					}
				}
			]
		};

		const mockResponse = {
			data: {
				accountsByCyBalance: [account1, account2],
				eligibleTotals: {
					id: 'SINGLETON',
					totalEligibleSum: '2000000000000000000000',
					totalEligibleSumSnapshot: '3000000000000000000000'
				}
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockResponse
		} as Response);

		const result = await fetchTopRewards();

		expect(result).toEqual([
			{
				account: '0x123',
				eligibleBalances: {
					cysFLR: ONE,
					cyWETH: 2n * ONE
				},
				shares: calculateShares(account1, mockResponse.data.eligibleTotals)
			},
			{
				account: '0x456',
				eligibleBalances: {
					cysFLR: ONE / 2n,
					cyWETH: ONE
				},
				shares: calculateShares(account2, mockResponse.data.eligibleTotals)
			}
		]);

		expect(fetch).toHaveBeenCalledWith(MOCKED_SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: TopAccounts })
		});
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAccountStatus } from './fetchAccountStatus';
import { ONE } from '$lib/constants';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
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

describe('fetchAccountStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches AccountStatus correctly', async () => {
		const account = '0x123';
		const mockData = {
			data: {
				eligibleTotals: {
					id: 'SINGLETON',
					totalEligibleSum: '2000000000000000000000',
					totalEligibleSumSnapshot: '3000000000000000000000'
				},
				account: {
					id: account,
					totalCyBalance: (300n * ONE).toString(),
					totalCyBalanceSnapshot: (300n * ONE).toString(),
					vaultBalances: [
						{
							balance: (110n * ONE).toString(),
							balanceAvgSnapshot: (100n * ONE).toString(),
							vault: {
								address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex // cysFLR address
							}
						},
						{
							balance: (210n * ONE).toString(),
							balanceAvgSnapshot: (200n * ONE).toString(),
							vault: {
								address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex // cyWETH address
							}
						}
					],
					transfersIn: [
						{
							fromIsApprovedSource: true,
							transactionHash: 'hash1',
							blockTimestamp: '1000',
							tokenAddress: '0xtoken1',
							from: { id: '0x123' },
							to: { id: '0x456' },
							value: '100000000000000000000',
							id: 'transfer1',
							blockNumber: '1000'
						}
					],
					transfersOut: [
						{
							fromIsApprovedSource: false,
							transactionHash: 'hash2',
							blockTimestamp: '2000',
							tokenAddress: '0xtoken2',
							from: { id: '0x456' },
							to: { id: '0x123' },
							value: '200000000000000000000',
							id: 'transfer2',
							blockNumber: '2000'
						}
					],
					liquidityChanges: []
				}
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockData
		} as Response);

		const result = await fetchAccountStatus(account);

		expect(result).toEqual({
			account,
			eligibleBalances: {
				cysFLR: 100n * ONE,
				cyWETH: 200n * ONE
			},
			shares: calculateShares(mockData.data.account, mockData.data.eligibleTotals),
			transfers: {
				in: mockData.data.account.transfersIn,
				out: mockData.data.account.transfersOut
			},
			liquidityChanges: mockData.data.account.liquidityChanges
		});

		expect(fetch).toHaveBeenCalledWith(MOCKED_SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: AccountStatus, variables: { account } })
		});
	});

	it('correctly merges and sorts transfers by timestamp', async () => {
		const account = '0x123';
		const mockData = {
			data: {
				eligibleTotals: {
					id: 'SINGLETON',
					totalEligibleSum: '2000000000000000000000',
					totalEligibleSumSnapshot: '3000000000000000000000'
				},
				account: {
					id: account,
					totalCyBalance: '200000000000000000000',
					totalCyBalanceSnapshot: '300000000000000000000',
					vaultBalances: [
						{
							balance: '200000000000000000000',
							balanceAvgSnapshot: '100000000000000000000',
							vault: {
								address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex // cysFLR address
							}
						},
						{
							balance: '100000000000000000000',
							balanceAvgSnapshot: '200000000000000000000',
							vault: {
								address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex // cyWETH address
							}
						}
					],
					transfersIn: [
						{
							fromIsApprovedSource: true,
							transactionHash: 'hash3',
							blockTimestamp: '15',
							tokenAddress: '0xtoken1',
							from: { id: '0x789' },
							to: { id: '0x123' },
							value: '200000000000000000',
							id: 'transfer3',
							blockNumber: '15'
						},
						{
							fromIsApprovedSource: true,
							transactionHash: 'hash4',
							blockTimestamp: '25',
							tokenAddress: '0xtoken1',
							from: { id: '0x789' },
							to: { id: '0x123' },
							value: '100000000000000000',
							id: 'transfer4',
							blockNumber: '25'
						}
					],
					transfersOut: [
						{
							fromIsApprovedSource: false,
							transactionHash: 'hash1',
							blockTimestamp: '10',
							tokenAddress: '0xtoken1',
							from: { id: '0x123' },
							to: { id: '0x456' },
							value: '500000000000000000',
							id: 'transfer1',
							blockNumber: '10'
						},
						{
							fromIsApprovedSource: false,
							transactionHash: 'hash2',
							blockTimestamp: '20',
							tokenAddress: '0xtoken1',
							from: { id: '0x123' },
							to: { id: '0x456' },
							value: '300000000000000000',
							id: 'transfer2',
							blockNumber: '20'
						}
					],
					liquidityChanges: []
				}
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockData
		} as Response);

		const result = await fetchAccountStatus(account);

		expect(result.transfers).toEqual({
			in: mockData.data.account.transfersIn,
			out: mockData.data.account.transfersOut
		});
	});
});

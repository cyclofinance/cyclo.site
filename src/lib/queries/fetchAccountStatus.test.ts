import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAccountStatus } from './fetchAccountStatus';
import { ONE, SUBGRAPH_URL } from '$lib/constants';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import { calculateShares } from './calculateShares';
vi.mock('$lib/constants', () => ({
	SUBGRAPH_URL: 'http://mocked-subgraph-url',
	ONE: 1000000000000000000000n,
	TOTAL_REWARD: 1000000000000000000000n
}));

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
					totalEligibleCyWETH: '1000000000000000000000',
					totalEligibleCysFLR: '2000000000000000000000',
					totalEligibleSum: '3000000000000000000000'
				},
				account: {
					cysFLRBalance: (100n * ONE).toString(),
					cyWETHBalance: (200n * ONE).toString(),
					totalCyBalance: (300n * ONE).toString(),
					eligibleShare: '0.1',
					transfersIn: [
						{
							fromIsApprovedSource: true,
							transactionHash: 'hash1',
							blockTimestamp: '1000',
							tokenAddress: '0xtoken1',
							from: { id: '0x123' },
							to: { id: '0x456' },
							value: '100000000000000000000'
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
							value: '200000000000000000000'
						}
					]
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
			}
		});

		expect(fetch).toHaveBeenCalledWith(SUBGRAPH_URL, {
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
					totalEligibleCyWETH: '1000000000000000000000',
					totalEligibleCysFLR: '2000000000000000000000',
					totalEligibleSum: '3000000000000000000000'
				},
				account: {
					cysFLRBalance: '100000000000000000000',
					cyWETHBalance: '200000000000000000000',
					totalCyBalance: '300000000000000000000',
					eligibleShare: '0.1',
					transfersIn: [
						{
							fromIsApprovedSource: true,
							transactionHash: 'hash3',
							blockTimestamp: '15',
							tokenAddress: '0xtoken1',
							from: { id: '0x789' },
							to: { id: '0x123' },
							value: '200000000000000000'
						},
						{
							fromIsApprovedSource: true,
							transactionHash: 'hash4',
							blockTimestamp: '25',
							tokenAddress: '0xtoken1',
							from: { id: '0x789' },
							to: { id: '0x123' },
							value: '100000000000000000'
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
							value: '500000000000000000'
						},
						{
							fromIsApprovedSource: false,
							transactionHash: 'hash2',
							blockTimestamp: '20',
							tokenAddress: '0xtoken1',
							from: { id: '0x123' },
							to: { id: '0x456' },
							value: '300000000000000000'
						}
					]
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

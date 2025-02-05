import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAccountStatus } from './fetchAccountStatus';
import { SUBGRAPH_URL } from '$lib/constants';
import AccountStatus from '$lib/queries/account-status.graphql?raw';

vi.mock('$lib/constants', () => ({
	SUBGRAPH_URL: 'http://mocked-subgraph-url'
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
			netTransfers: {
				cysFLR: '100.0',
				cyWETH: '200.0'
			},
			percentage: 10,
			proRataReward: 100000,
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

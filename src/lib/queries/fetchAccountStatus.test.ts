import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAccountStatus } from './fetchAccountStatus';
import { SUBGRAPH_URL } from '$lib/constants';
import AccountStatus from '$lib/queries/account-status.graphql?raw';

vi.mock('$lib/constants', () => ({
	SUBGRAPH_URL: 'http://mocked-subgraph-url'
}));

global.fetch = vi.fn();
const TOTAL_REWARD = 1_000_000; // 1M rFLR

describe('fetchAccountStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches fetchAccountStatus correctly', async () => {
		const account = '0x123';
		const mockData = {
			data: {
				trackingPeriods: [
					{ totalApprovedTransfersIn: '1000000000000000000000', period: 'ALL_TIMES' }
				],
				trackingPeriodForAccounts: [{ netApprovedTransfersIn: '100000000000000000000' }],
				sentTransfers: [
					{ id: '1', blockTimestamp: '10', amount: '500000000000000000' },
					{ id: '2', blockTimestamp: '15', amount: '300000000000000000' }
				],
				receivedTransfers: [{ id: '3', blockTimestamp: '12', amount: '200000000000000000' }]
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockData
		} as Response);

		const result = await fetchAccountStatus(account);

		expect(result.periodStats).toEqual([
			{
				period: 'ALL_TIMES',
				totalNet: '1000000000000000000000',
				accountNet: '100000000000000000000',
				percentage: 10,
				proRataReward: TOTAL_REWARD * 0.1
			}
		]);

		expect(result.transfers).toEqual([
			{ id: '3', blockTimestamp: '12', amount: '200000000000000000' },
			{ id: '1', blockTimestamp: '10', amount: '500000000000000000' },
			{ id: '2', blockTimestamp: '15', amount: '300000000000000000' }
		]);

		expect(fetch).toHaveBeenCalledWith(SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: AccountStatus, variables: { account } })
		});
	});
});

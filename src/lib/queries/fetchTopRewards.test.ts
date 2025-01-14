import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTopRewards } from './fetchTopRewards';
import { SUBGRAPH_URL } from '$lib/constants';
import TopRewards from '$lib/queries/top-rewards.graphql?raw';

vi.mock('$lib/constants', () => ({
	SUBGRAPH_URL: 'http://mocked-subgraph-url'
}));

global.fetch = vi.fn();

describe('fetchTopRewards', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and computes leaderboard entries correctly', async () => {
		const mockResponse = {
			data: {
				trackingPeriods: [{ totalApprovedTransfersIn: '1000000000000000000000' }],
				trackingPeriodForAccounts: [
					{
						account: { id: '0x123' },
						netApprovedTransfersIn: '500000000000000000000'
					},
					{
						account: { id: '0x456' },
						netApprovedTransfersIn: '250000000000000000000'
					}
				]
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockResponse
		} as Response);

		const result = await fetchTopRewards();

		expect(result).toEqual([
			{
				account: '0x123',
				netTransfers: '500000000000000000000',
				percentage: 50,
				proRataReward: 500000
			},
			{
				account: '0x456',
				netTransfers: '250000000000000000000',
				percentage: 25,
				proRataReward: 250000
			}
		]);

		expect(fetch).toHaveBeenCalledWith(SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: TopRewards })
		});
	});
});

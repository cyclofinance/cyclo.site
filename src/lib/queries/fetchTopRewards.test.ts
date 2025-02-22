import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTopRewards } from './fetchTopRewards';
import { SUBGRAPH_URL } from '$lib/constants';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';

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
				accountsByCyBalance: [
					{
						id: '0x123',
						cysFLRBalance: '1000000000000000000000',
						cyWETHBalance: '2000000000000000000000',
						totalCyBalance: '100000000000000000000'
					},
					{
						id: '0x456',
						cysFLRBalance: '500000000000000000000',
						cyWETHBalance: '1000000000000000000000',
						totalCyBalance: '50000000000000000000'
					}
				],
				eligibleTotals: {
					totalEligibleSum: '1000000000000000000000'
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
				netTransfers: {
					cysFLR: '1000.0',
					cyWETH: '2000.0'
				},
				percentage: 10,
				proRataReward: 100000
			},
			{
				account: '0x456',
				netTransfers: {
					cysFLR: '500.0',
					cyWETH: '1000.0'
				},
				percentage: 5,
				proRataReward: 50000
			}
		]);

		expect(fetch).toHaveBeenCalledWith(SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: TopAccounts })
		});
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTopRewards } from './fetchTopRewards';
import { ONE } from '$lib/constants';
import TopAccounts from '$lib/queries/top-rewards.graphql?raw';
import { calculateShares } from './calculateShares';

vi.mock('$lib/constants', () => ({
	ONE: 1000000000000000000000n,
	TOTAL_REWARD: 1000000000000000000000n
}));

const MOCK_REWARDS_SUBGRAPH_URL = 'https://mock-subgraph.example/graphql';

vi.mock('$lib/stores', () => ({
	rewardsSubgraphUrl: {
		subscribe: (run: (value: string) => void) => {
			run(MOCK_REWARDS_SUBGRAPH_URL);
			return () => {};
		}
	}
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
						cyFXRPBalance: '0',
						cyWBTCBalance: '0',
						cycbBTCBalance: '0',
						totalCyBalance: '100000000000000000000'
					},
					{
						id: '0x456',
						cysFLRBalance: '500000000000000000000',
						cyWETHBalance: '1000000000000000000000',
						cyFXRPBalance: '0',
						cyWBTCBalance: '0',
						cycbBTCBalance: '0',
						totalCyBalance: '50000000000000000000'
					}
				],
				eligibleTotals: {
					id: 'SINGLETON',
					totalEligibleCyWETH: '1000000000000000000000',
					totalEligibleCysFLR: '2000000000000000000000',
					totalEligibleCyFXRP: '0',
					totalEligibleCyWBTC: '0',
					totalEligibleCycbBTC: '0',
					totalEligibleSum: '3000000000000000000000'
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
					cyWETH: 2n * ONE,
					cyFXRP: 0n,
					cyWBTC: 0n,
					cycbBTC: 0n
				},
				shares: calculateShares(
					mockResponse.data.accountsByCyBalance[0],
					mockResponse.data.eligibleTotals
				)
			},
			{
				account: '0x456',
				eligibleBalances: {
					cysFLR: ONE / 2n,
					cyWETH: ONE,
					cyFXRP: 0n,
					cyWBTC: 0n,
					cycbBTC: 0n
				},
				shares: calculateShares(
					mockResponse.data.accountsByCyBalance[1],
					mockResponse.data.eligibleTotals
				)
			}
		]);

		expect(fetch).toHaveBeenCalledWith(MOCK_REWARDS_SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: TopAccounts })
		});
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStats } from './fetchStats';
import { SUBGRAPH_URL } from '$lib/constants';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';

vi.mock('$lib/constants', () => ({
	SUBGRAPH_URL: 'http://mocked-subgraph-url'
}));

global.fetch = vi.fn();

vi.mock('./cysFLRwFLRQuote', () => ({
	getcysFLRwFLRPrice: vi.fn()
}));

const MONTHLY_REWARDS = 1_000_000n * 10n ** 18n; // 1M rFLR

describe('fetchTopRewards', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and calculates stats correctly', async () => {
		const mockResponse = {
			data: {
				trackingPeriods: [
					{
						totalApprovedTransfersIn: '1000000000000000000000' // 1000 cysFLR
					}
				],
				trackingPeriodForAccounts: [{ account: { id: '0x123' } }, { account: { id: '0x456' } }]
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockResponse
		} as Response);

		const cysFLRwFLRPrice = 2n * 10n ** 18n;
		const totalEligibleHoldings = 1000000000000000000000n;
		vi.mocked(getcysFLRwFLRPrice).mockResolvedValueOnce(cysFLRwFLRPrice);

		const totalEligibleHoldingsInFLR = (totalEligibleHoldings * cysFLRwFLRPrice) / 10n ** 18n;
		const currentApy = ((MONTHLY_REWARDS * 10n ** 18n) / totalEligibleHoldingsInFLR) * 12n * 100n;
		const result = await fetchStats();

		expect(result).toEqual({
			eligibleHolders: 2,
			totalEligibleHoldings,
			monthlyRewards: MONTHLY_REWARDS,
			currentApy
		});

		expect(global.fetch).toHaveBeenCalledWith(SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: Stats })
		});

		expect(getcysFLRwFLRPrice).toHaveBeenCalled();
	});
});

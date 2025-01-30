import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStats } from './fetchStats';
import { SUBGRAPH_URL } from '$lib/constants';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';

vi.mock('$lib/constants', () => ({
	SUBGRAPH_URL: 'http://mocked-subgraph-url'
}));

vi.mock('./cysFLRwFLRQuote', () => ({
	getcysFLRwFLRPrice: vi.fn()
}));

vi.mock('./cyWETHwFLRQuote', () => ({
	getcyWETHwFLRPrice: vi.fn()
}));

global.fetch = vi.fn();

describe('fetchStats', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and calculates stats correctly', async () => {
		const mockResponse = {
			data: {
				eligibleTotals: {
					totalEligibleCyWETH: '1000000000000000000000',
					totalEligibleCysFLR: '2000000000000000000000',
					totalEligibleSum: '3000000000000000000000'
				},
				accounts: Array(96).fill({}) // Mock 96 accounts
			}
		};

		vi.mocked(global.fetch).mockResolvedValueOnce({
			json: async () => mockResponse
		} as Response);

		// Mock price quotes
		vi.mocked(getcysFLRwFLRPrice).mockResolvedValueOnce(BigInt('500000000000000000')); // 0.5 FLR
		vi.mocked(getcyWETHwFLRPrice).mockResolvedValueOnce(BigInt('1000000000000000000')); // 1 FLR

		const result = await fetchStats();

		expect(result).toEqual({
			eligibleHolders: 96,
			totalEligibleCysFLR: BigInt('2000000000000000000000'),
			totalEligibleCyWETH: BigInt('1000000000000000000000'),
			totalEligibleSum: BigInt('3000000000000000000000'),
			monthlyRewards: BigInt('1000000000000000000000000'),
			cysFLRApy: BigInt('800000000000000000000000'), // 800,000% (adjusted for 18 decimals)
			cyWETHApy: BigInt('400000000000000000000000') // 400,000% (adjusted for 18 decimals)
		});

		expect(fetch).toHaveBeenCalledWith(SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: Stats })
		});
	});
});

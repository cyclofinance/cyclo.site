import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateApy, fetchStats } from './fetchStats';
import { ONE } from '$lib/constants';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { getcyFXRPwFLRPrice } from './cyFXRPwFLRQuote';
import { calculateRewardsPools } from './calculateRewardsPools';

const MOCK_REWARDS_SUBGRAPH_URL = 'https://mock-subgraph.example/graphql';

vi.mock('$lib/stores', () => ({
	rewardsSubgraphUrl: {
		subscribe: (run: (value: string) => void) => {
			run(MOCK_REWARDS_SUBGRAPH_URL);
			return () => {};
		}
	}
}));

vi.mock('$lib/constants', () => ({
	TOTAL_REWARD: 1000000000000000000000n,
	ONE: 1000000000000000000000n
}));

vi.mock('./cysFLRwFLRQuote', () => ({
	getcysFLRwFLRPrice: vi.fn()
}));

vi.mock('./cyWETHwFLRQuote', () => ({
	getcyWETHwFLRPrice: vi.fn()
}));

vi.mock('./cyFXRPwFLRQuote', () => ({
	getcyFXRPwFLRPrice: vi.fn()
}));

global.fetch = vi.fn();

describe('calculateApy', () => {
	it('calculates apy correctly', () => {
		// if we have 500,000 rFLR in the pool, 5000 eligible cysFLR, and the price of 1 cysFLR is 50 FLR
		// every cysFLR purchased will net you 500,000/5000 = 100 rFLR
		// that cysFLR will cost you 50 FLR
		// so your return is 1000/50 = 2x your investment
		// over 12 months is 24x your investment
		const poolAmount = ONE * 500_000n;
		const totalEligible = ONE * 5000n;
		const price = ONE * 50n;
		const apy = calculateApy(poolAmount, totalEligible, price);
		expect(apy).toBe(2400n * ONE); // 2400%
	});

	it('returns 0 if either the price or the total eligible is 0', () => {
		const apy = calculateApy(ONE * 1000n, 0n, ONE * 50n);
		expect(apy).toBe(0n);
		const apy2 = calculateApy(ONE * 1000n, ONE * 5000n, 0n);
		expect(apy2).toBe(0n);
	});
});

describe('fetchStats', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and calculates stats correctly', async () => {
		const mockResponse = {
			data: {
				eligibleTotals: {
					id: 'SINGLETON',
					totalEligibleCyWETH: '1000000000000000000000',
					totalEligibleCysFLR: '2000000000000000000000',
					totalEligibleCyFXRP: '0',
					totalEligibleCyLINK: '0',
					totalEligibleCyDOT: '0',
					totalEligibleCyUNI: '0',
					totalEligibleCyPEPE: '0',
					totalEligibleCyENA: '0',
					totalEligibleCyARB: '0',
					totalEligibleCywstETH: '0',
					totalEligibleCyXAUt0: '0',
					totalEligibleCyPYTH: '0',
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
		vi.mocked(getcyFXRPwFLRPrice).mockResolvedValueOnce(BigInt('1000000000000000000')); // 1 FLR

		const result = await fetchStats();

		const rewardsPools = calculateRewardsPools(mockResponse.data.eligibleTotals);

		expect(result).toEqual({
			eligibleHolders: 96,
			totalEligibleCysFLR: BigInt('2000000000000000000000'),
			totalEligibleCyWETH: BigInt('1000000000000000000000'),
			totalEligibleCyFXRP: 0n,
			totalEligibleSum: BigInt('3000000000000000000000'),
			rewardsPools,
			cysFLRApy: calculateApy(
				rewardsPools.cysFlr,
				BigInt('2000000000000000000000'),
				BigInt('500000000000000000')
			),
			cyWETHApy: calculateApy(
				rewardsPools.cyWeth,
				BigInt('1000000000000000000000'),
				BigInt('1000000000000000000')
			),
			cyFXRPApy: 0n
		});

		expect(fetch).toHaveBeenCalledWith(MOCK_REWARDS_SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: Stats })
		});
	});
});

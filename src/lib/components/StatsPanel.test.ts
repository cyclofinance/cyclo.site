import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import StatsPanel from './StatsPanel.svelte';
import type { GlobalStats, CyToken } from '$lib/types';
import { ONE } from '$lib/constants';
import type { Hex } from 'viem';

vi.mock('$lib/queries/fetchStats', () => ({
	fetchStats: vi.fn()
}));

const { mockTokensStore, mockSelectedNetworkStore } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	const tokens: CyToken[] = [
		{
			name: 'cysFLR',
			address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
			underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as Hex,
			underlyingSymbol: 'sFLR',
			receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' as Hex,
			symbol: 'cysFLR',
			decimals: 18,
			chainId: 14,
			networkName: 'Flare',
			active: true
		},
		{
			name: 'cyWETH',
			address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
			underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex,
			underlyingSymbol: 'WETH',
			receiptAddress: '0xBE2615A0fcB54A49A1eB472be30d992599FE0968' as Hex,
			symbol: 'cyWETH',
			decimals: 18,
			chainId: 14,
			networkName: 'Flare',
			active: true
		}
	];
	return {
		mockTokensStore: writable(tokens),
		mockSelectedNetworkStore: writable({ rewardsSubgraphUrl: 'http://mocked-url' })
	};
});

vi.mock('$lib/stores', () => ({
	tokens: mockTokensStore,
	selectedNetwork: mockSelectedNetworkStore
}));

const mockStats: GlobalStats = {
	eligibleHolders: 100,
	totalEligible: {
		cysFLR: 1000000000000000000000n,
		cyWETH: 2000000000000000000000n
	},
	totalEligibleSum: 3000000000000000000000n,
	apy: {
		cysFLR: 500000000000000000n, // 0.5 (50% when formatted)
		cyWETH: 750000000000000000n // 0.75 (75% when formatted)
	},
	rewardsPools: {
		cysFLR: ONE * 1000n,
		cyWETH: ONE * 2000n
	}
};

describe('StatsPanel Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching stats', async () => {
		const { fetchStats } = await import('$lib/queries/fetchStats');
		vi.mocked(fetchStats).mockImplementation(() => new Promise(() => {}));

		render(StatsPanel);

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});

	it('should display StatsPanel when data is available', async () => {
		const { fetchStats } = await import('$lib/queries/fetchStats');
		vi.mocked(fetchStats).mockResolvedValue(mockStats);

		render(StatsPanel);

		await waitFor(() => {
			expect(screen.getByTestId('stats-panel')).toBeInTheDocument();
			expect(screen.getByText('~0.5000%')).toBeInTheDocument(); // cysFLR APY
			expect(screen.getByText('~0.7500%')).toBeInTheDocument(); // cyWETH APY
			expect(screen.getByText('100')).toBeInTheDocument(); // eligible holders
			expect(screen.getByText('3000.00')).toBeInTheDocument(); // total eligible (toFixed returns string, toLocaleString doesn't add commas)
			expect(screen.getByText('cysFLR: 1000.00')).toBeInTheDocument(); // cysFLR total
			expect(screen.getByText('cyWETH: 2000.00')).toBeInTheDocument(); // cyWETH total
			expect(screen.getByText('Monthly rFLR Rewards')).toBeInTheDocument();
			expect(screen.getByText('Total: 500,000')).toBeInTheDocument(); // total rewards
			expect(screen.getByText(`cysFLR: 1,000`)).toBeInTheDocument(); // cysFLR rewards
			expect(screen.getByText(`cyWETH: 2,000`)).toBeInTheDocument(); // cyWETH rewards
		});
	});

	it('should display error message when fetch fails', async () => {
		const { fetchStats } = await import('$lib/queries/fetchStats');
		vi.mocked(fetchStats).mockRejectedValue(new Error('Failed to fetch stats'));

		render(StatsPanel);

		await waitFor(() => {
			expect(screen.getByTestId('error')).toBeInTheDocument();
			expect(screen.getByText('Failed to fetch stats')).toBeInTheDocument();
		});
	});
});

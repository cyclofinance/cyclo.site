import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import StatsPanel from './StatsPanel.svelte';
import type { GlobalStats } from '$lib/types';
import { ONE } from '$lib/constants';

vi.mock('$lib/queries/fetchStats', () => ({
	fetchStats: vi.fn()
}));

const mockStats: GlobalStats = {
	eligibleHolders: 100,
	totalEligibleCysFLR: 1000000000000000000000n,
	totalEligibleCyWETH: 2000000000000000000000n,
	totalEligibleCyFXRP: 0n,
	totalEligibleSum: 3000000000000000000000n,
	cysFLRApy: 500000000000000000n, // 50%
	cyWETHApy: 750000000000000000n, // 75%
	cyFXRPApy: 0n,
	rewardsPools: {
		cysFlr: ONE * 1000n,
		cyWeth: ONE * 2000n,
		cyFxrp: 0n
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
			expect(screen.getByText('3000.00')).toBeInTheDocument(); // total eligible
			expect(screen.getByText('cysFLR: 1000.00')).toBeInTheDocument(); // cysFLR total
			expect(screen.getByText('cyWETH: 2000.00')).toBeInTheDocument(); // cyWETH total
			expect(screen.getByText('Monthly rFLR Rewards')).toBeInTheDocument();
			expect(screen.getByText('Total: 2,000,000')).toBeInTheDocument(); // total rewards
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

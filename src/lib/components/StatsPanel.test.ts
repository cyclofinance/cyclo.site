import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import StatsPanel from './StatsPanel.svelte';
import { type GlobalStats } from '$lib/queries/fetchStats';

const globalStats: GlobalStats =
	{
		eligibleHolders: 96,
		totalEligibleHoldings: BigInt(173689146516658495317091n),
		monthlyRewards:  BigInt(1000000000000000000000000n),
		currentApy: BigInt(291724135736581994400n)
	}

vi.mock('$lib/queries/fetchStats', () => ({
	fetchStats: vi.fn()
}));

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

	it('should show error when fetching stats fail', async () => {
		const { fetchStats } = await import('$lib/queries/fetchStats');
		vi.mocked(fetchStats).mockRejectedValue(new Error('Async error'));

		render(StatsPanel);

		await waitFor(() => {
			expect(screen.getByTestId('error')).toBeInTheDocument();
		});
	});

	it('should display StatsPanel when data is available', async () => {
		const { fetchStats } = await import('$lib/queries/fetchStats');
		vi.mocked(fetchStats).mockResolvedValue(globalStats);

		render(StatsPanel);

		await waitFor(() => {
			expect(screen.getByText('96')).toBeInTheDocument();
			expect(screen.getByText('173689.14651666')).toBeInTheDocument();
			expect(screen.getByText('1,000,000')).toBeInTheDocument();
		});
	});
});

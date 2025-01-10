import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import StatsPanel from './StatsPanel.svelte';

vi.mock('$lib/queries/fetchStats', () => ({
	fetchStats: vi.fn()
}));

describe('Leaderboard Component', () => {
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
});

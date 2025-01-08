import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import Leaderboard from './Leaderboard.svelte';
import { type LeaderboardEntry } from '$lib/queries/fetchTopRewards';

vi.mock('$lib/queries/fetchTopRewards', () => ({
	fetchTopRewards: vi.fn()
}));

const mockLeader: LeaderboardEntry[] = [
	{
		account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4',
		netTransfers: '20261529360304309332079',
		percentage: 10,
		proRataReward: 10
	}
] as unknown as LeaderboardEntry[];

describe('Leaderboard Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching topRewards', async () => {
		const { fetchTopRewards } = await import('$lib/queries/fetchTopRewards');
		vi.mocked(fetchTopRewards).mockImplementation(() => new Promise(() => {}));

		render(Leaderboard);

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});

	it('should display leaderBoard table when data is available', async () => {
		const { fetchTopRewards } = await import('$lib/queries/fetchTopRewards');
		vi.mocked(fetchTopRewards).mockResolvedValue(mockLeader);

		render(Leaderboard);

		await waitFor(() => {
			expect(screen.getByText('20261.529360304309332079')).toBeInTheDocument();
			expect(screen.getByText('10%')).toBeInTheDocument();
			expect(screen.getByText('10')).toBeInTheDocument();
		});
	});
});

import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import Leaderboard from './Leaderboard.svelte';
import { type LeaderboardEntry } from '$lib/queries/fetchTopRewards';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('svelte-wagmi', () => ({
	signerAddress: {
		subscribe: vi.fn((fn) => {
			fn('0x1234567890123456789012345678901234567890');
			return () => {};
		})
	}
}));

vi.mock('$lib/queries/fetchTopRewards', () => ({
	fetchTopRewards: vi.fn()
}));

const mockLeaderboard: LeaderboardEntry[] = [
	{
		account: '0x1234567890123456789012345678901234567890',
		netTransfers: {
			cysFLR: '1000.0',
			cyWETH: '2000.0'
		},
		percentage: 10,
		proRataReward: 100000
	}
];

describe('Leaderboard Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching leaderboard', async () => {
		const { fetchTopRewards } = await import('$lib/queries/fetchTopRewards');
		vi.mocked(fetchTopRewards).mockImplementation(() => new Promise(() => {}));

		render(Leaderboard);

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});

	it('should display leaderBoard table when data is available', async () => {
		const { fetchTopRewards } = await import('$lib/queries/fetchTopRewards');
		vi.mocked(fetchTopRewards).mockResolvedValue(mockLeaderboard);

		render(Leaderboard);

		await waitFor(() => {
			expect(screen.getByText('1000.0')).toBeInTheDocument(); // cysFLR value
			expect(screen.getByText('2000.0')).toBeInTheDocument(); // cyWETH value
			expect(screen.getByText('10.0000%')).toBeInTheDocument(); // percentage
			expect(screen.getByText('100000.00')).toBeInTheDocument(); // proRataReward
		});
	});

	it('should navigate to account page when clicking on a row', async () => {
		const { fetchTopRewards } = await import('$lib/queries/fetchTopRewards');
		vi.mocked(fetchTopRewards).mockResolvedValue(mockLeaderboard);

		render(Leaderboard);

		// Wait for component to load and get link
		const accountLink = await screen.findByText('#1 0x1234...7890');

		// Check the href attribute
		expect(accountLink.closest('a')).toHaveAttribute(
			'href',
			'/rewards/0x1234567890123456789012345678901234567890'
		);
	});
});

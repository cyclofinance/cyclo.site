import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import Leaderboard from './Leaderboard.svelte';
import type { LeaderboardEntry, CyToken } from '$lib/types';
import { ONE } from '$lib/constants';
import type { Hex } from 'viem';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

const { mockTokensStore } = vi.hoisted(() => {
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
		mockTokensStore: writable(tokens)
	};
});

vi.mock('$lib/stores', () => ({
	tokens: mockTokensStore
}));

vi.mock('svelte-wagmi', () => ({
	signerAddress: {
		subscribe: vi.fn((fn) => {
			fn('0x1234567890123456789012345678901234567890');
			return () => {};
		})
	},
	chainId: {
		subscribe: vi.fn((fn) => {
			fn(14);
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
		eligibleBalances: {
			cysFLR: BigInt(100) * ONE,
			cyWETH: BigInt(200) * ONE
		},
		shares: {
			cysFLR: {
				percentageShare: ONE / 10n,
				rewardsAmount: ONE / 10n
			},
			cyWETH: {
				percentageShare: ONE / 10n,
				rewardsAmount: ONE / 10n
			},
			totalRewards: 20n * ONE
		} as unknown as LeaderboardEntry['shares']
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
			expect(screen.getByText('100.0000')).toBeInTheDocument(); // cysFLR value
			expect(screen.getByText('200.0000')).toBeInTheDocument(); // cyWETH value
			expect(screen.getAllByText('(10.0000%)')).toHaveLength(2); // percentage
			expect(screen.getByTestId('total-rewards')).toHaveTextContent('20.0000'); // proRataReward
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

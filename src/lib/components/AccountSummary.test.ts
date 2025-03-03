import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
import AccountSummary from './AccountSummary.svelte';
import type { AccountStats } from '$lib/types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

const mockStats: AccountStats = {
	account: '0x1234567890123456789012345678901234567890',
	eligibleBalances: {
		cysFLR: BigInt(100),
		cyWETH: BigInt(200)
	},
	shares: {
		cysFLR: {
			percentageShare: BigInt(50),
			rewardsAmount: BigInt(10)
		},
		cyWETH: {
			percentageShare: BigInt(50),
			rewardsAmount: BigInt(10)
		},
		totalRewards: BigInt(20)
	},
	transfers: {
		in: [],
		out: []
	}
};

describe('AccountSummary Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching AccountSummary', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockImplementation(() => new Promise(() => {}));

		render(AccountSummary, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});

	it('should display Full Tx History button', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

		render(AccountSummary, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByText('Your Rewards')).toBeInTheDocument();
			expect(screen.getByTestId('full-tx-history-button')).toBeInTheDocument();
		});
	});

	it('should have the right url for the account page', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

		render(AccountSummary, { props: { account: '0x1234567890123456789012345678901234567890' } });

		// Wait for component to load and get button
		const link = await screen.findByTestId('full-tx-history-button');

		// Check the href attribute
		expect(link).toHaveAttribute('href', '/rewards/0x1234567890123456789012345678901234567890');
	});
});

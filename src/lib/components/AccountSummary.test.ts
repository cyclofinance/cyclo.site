import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
import AccountSummary from './AccountSummary.svelte';
import { type AccountStats } from '$lib/queries/fetchAccountStatus';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

const mockStats: AccountStats = {
	netTransfers: {
		cysFLR: '100.0',
		cyWETH: '200.0'
	},
	percentage: 50,
	proRataReward: 10,
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

	it('should navigate to correct url after button click', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

		render(AccountSummary, { props: { account: '0x1234567890123456789012345678901234567890' } });

		// Wait for component to load and get button
		const link = await screen.findByTestId('full-tx-history-button');

		// Check the href attribute
		expect(link).toHaveAttribute('href', '/rewards/0x1234567890123456789012345678901234567890');
	});

	it('should display `not eligible for rewards` text if account not eligible', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({
			...mockStats,
			percentage: 0,
			proRataReward: 0
		});

		render(AccountSummary, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByText('Your Rewards')).toBeInTheDocument();
			expect(
				screen.getByText(
					'This account is not eligible for rewards. Only accounts with positive net transfers from approved sources are eligible.'
				)
			).toBeInTheDocument();
		});
	});

	it('should display periodStats', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

		render(AccountSummary, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByText('100.0')).toBeInTheDocument(); // cysFLR value
			expect(screen.getByText('200.0')).toBeInTheDocument(); // cyWETH value
			expect(screen.getByText('50.0000%')).toBeInTheDocument(); // percentage
			expect(screen.getByText('10.00')).toBeInTheDocument(); // proRataReward
		});
	});
});

import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import AccountSummary from './AccountSummary.svelte';
import { type PeriodStats } from '$lib/queries/fetchAccountStatus';
import type { AccountStatusQuery } from '../../generated-graphql';

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

const periodStats: PeriodStats[] = [
	{
		account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4',
		netTransfers: '20261529360304309332079',
		period: 'ALL_TIMES',
		totalNet: '20261529360304309332079',
		accountNet: '61529360304309332079',
		percentage: 50,
		proRataReward: 10
	}
] as unknown as PeriodStats[];

let transfers: NonNullable<AccountStatusQuery['sentTransfers']> = [];

describe('AccountSummary Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching AccountSummary', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockImplementation(() => new Promise(() => {}));

		render(AccountSummary);

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});

	it('should display Full Tx History button', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({ periodStats, transfers });

		render(AccountSummary, { props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' } });

		await waitFor(() => {
			expect(screen.getByText('Your Rewards')).toBeInTheDocument();
			expect(screen.getByText('Full Tx History')).toBeInTheDocument();
		});
	});
});

import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import AccountStatus from './AccountStatus.svelte';
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

const transfers: NonNullable<AccountStatusQuery['sentTransfers']> = [];

describe('AccountStatus Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching AccountStatus', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockImplementation(() => new Promise(() => {}));

		render(AccountStatus);

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});

	it('should display Estimated Rewards for the account', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({ periodStats, transfers });

		render(AccountStatus, { props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' } });

		await waitFor(() => {
			expect(screen.getByTestId('period-stats')).toBeInTheDocument();
			expect(screen.getByText(`Estimated Rewards for 0x2b46...bda4`)).toBeInTheDocument();
		});
	});
});

import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import AccountSummary from './AccountSummary.svelte';
import { type PeriodStats } from '$lib/queries/fetchAccountStatus';
import type { AccountStatusQuery } from '../../generated-graphql';
import { goto } from '$app/navigation';

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
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

	it('should navigate to correct url after button click', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({ periodStats, transfers });

		const { getByTestId } = render(AccountSummary, {
			props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' }
		});

		await waitFor(async () => {
			const button = getByTestId('full-tx-history-button');

			await fireEvent.click(button);

			expect(goto).toHaveBeenCalledWith(`/rewards/0x2b462b16cb267f7545eb45829a2ce1559e56bda4`);
		});
	});

	it('should display `not eligible for rewards` text if account not eligible', async () => {
		const mockPeriodStats: PeriodStats[] = [
			{
				account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4',
				netTransfers: '20261529360304309332079',
				period: 'ALL_TIMES',
				totalNet: '20261529360304309332079',
				accountNet: '61529360304309332079',
				percentage: 0,
				proRataReward: 0
			}
		] as unknown as PeriodStats[];

		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({ periodStats: mockPeriodStats, transfers });

		render(AccountSummary, { props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' } });

		await waitFor(() => {
			expect(screen.getByText(`Your Rewards`)).toBeInTheDocument();
			expect(
				screen.getByText(
					`This account is not eligible for rewards. Only accounts with positive net transfers from approved sources are eligible.`
				)
			).toBeInTheDocument();

			expect(screen.getByText(`0%`)).toBeInTheDocument();
			expect(screen.getByText(`0`)).toBeInTheDocument();
		});
	});

	it('should display periodStats', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({ periodStats, transfers });
		render(AccountSummary, { props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' } });
		await waitFor(() => {
			expect(screen.getByText(`50%`)).toBeInTheDocument();
			expect(screen.getByText(`10`)).toBeInTheDocument();
		});
	});
});

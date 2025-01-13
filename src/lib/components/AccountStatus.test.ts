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

let transfers: NonNullable<AccountStatusQuery['sentTransfers']> = [];

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

		render(AccountStatus, { props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' } });

		await waitFor(() => {
			expect(screen.getByTestId('period-stats')).toBeInTheDocument();
			expect(screen.getByText(`Estimated Rewards for 0x2b46...bda4`)).toBeInTheDocument();
			expect(
				screen.getByText(
					`This account is not eligible for rewards. Only accounts with positive net transfers from approved sources are eligible.`
				)
			).toBeInTheDocument();
		});
	});

	it('should display Transfer History', async () => {
		transfers = [
			{
				fromIsApprovedSource: true,
				blockTimestamp: '35754197',
				transactionHash: '0xe2ad712db50bbb1a9b5fbd39d6efe8833d4d99e9d7a5588ac9a28c00b9fb5aea',
				value: '1515222',
				from: { id: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' },
				to: { id: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' }
			}
		];

		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({ periodStats, transfers });
		render(AccountStatus, { props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' } });
		await waitFor(() => {
			expect(screen.getByTestId('transfer-history')).toBeInTheDocument();
			expect(screen.getByText(`Sent to 0x2b46...bda4`)).toBeInTheDocument();
		});
	});

	it('should check transfer from different account', async () => {
		transfers = [
			{
				fromIsApprovedSource: true,
				blockTimestamp: '35754197',
				transactionHash: '0xe2ad712db50bbb1a9b5fbd39d6efe8833d4d99e9d7a5588ac9a28c00b9fb5aea',
				value: '1515222',
				from: { id: '0xc0D477556c25C9d67E1f57245C7453DA776B51cf' },
				to: { id: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' }
			}
		];

		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({ periodStats, transfers });
		render(AccountStatus, { props: { account: '0x2b462b16cb267f7545eb45829a2ce1559e56bda4' } });

		await waitFor(() => {
			expect(screen.getByTestId('transfer-history')).toBeInTheDocument();
			expect(screen.getByText(`Received from 0xc0D4...51cf`)).toBeInTheDocument();
			expect(screen.getByText(`2/18/1971, 11:43:17 PM`)).toBeInTheDocument();
			expect(screen.getByText(`0.000000000001515222`)).toBeInTheDocument();
		});
	});
});

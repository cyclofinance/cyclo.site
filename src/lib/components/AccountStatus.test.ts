import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import AccountStatus from './AccountStatus.svelte';
import { get } from 'svelte/store';
import { tokens } from '$lib/stores';
import type { AccountStats } from '$lib/types';

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

const tokenList = get(tokens);

const mockStats: AccountStats = {
	account: '0x1234567890123456789012345678901234567890',
	eligibleBalances: {
		cysFLR: BigInt(100),
		cyWETH: BigInt(200),
		cyFXRP: 0n
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
		cyFXRP: {
			percentageShare: 0n,
			rewardsAmount: 0n
		},
		totalRewards: BigInt(20)
	},
	transfers: {
		in: [
			{
				id: '1',
				blockNumber: 1,
				fromIsApprovedSource: true,
				transactionHash: 'hash1',
				blockTimestamp: '1000',
				tokenAddress: tokenList[0]?.address ?? '0x0',
				from: { id: '0x1234567890123456789012345678901234567890' },
				to: { id: '0x2345678901234567890123456789012345678901' },
				value: '100000000000000000000'
			}
		],
		out: [
			{
				id: '2',
				blockNumber: 2,
				fromIsApprovedSource: false,
				transactionHash: 'hash2',
				blockTimestamp: '2000',
				tokenAddress: tokenList[1]?.address ?? '0x0',
				from: { id: '0x2345678901234567890123456789012345678901' },
				to: { id: '0x1234567890123456789012345678901234567890' },
				value: '200000000000000000000'
			}
		]
	}
};

describe('AccountStatus Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching AccountStatus', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockImplementation(() => new Promise(() => {}));

		render(AccountStatus, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});

	it('should display Estimated Rewards for the account', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

		render(AccountStatus, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByTestId('period-stats')).toBeInTheDocument();
			expect(screen.getByText('Estimated Rewards for 0x1234...7890')).toBeInTheDocument();
		});
	});

	it('should display `not eligible for rewards` text if account not eligible', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({
			...mockStats,
			eligibleBalances: {
				cysFLR: BigInt(0),
				cyWETH: BigInt(0),
				cyFXRP: 0n
			}
		});

		render(AccountStatus, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByTestId('period-stats')).toBeInTheDocument();
			expect(screen.getByText('Estimated Rewards for 0x1234...7890')).toBeInTheDocument();
			expect(
				screen.getByText(
					'This account is not eligible for rewards. Only accounts with positive net transfers from approved sources are eligible.'
				)
			).toBeInTheDocument();
		});
	});

	it('should display Transfer History', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

		render(AccountStatus, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByTestId('transfer-history')).toBeInTheDocument();
			expect(screen.getByText('Sent to 0x2345...8901')).toBeInTheDocument();
		});
	});
});

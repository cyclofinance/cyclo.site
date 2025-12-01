import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
import AccountSummary from './AccountSummary.svelte';
import type { AccountStats } from '$lib/types';
import { ONE } from '$lib/constants';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

const mockStats: AccountStats = {
	account: '0x1234567890123456789012345678901234567890',
	eligibleBalances: {
		cysFLR: BigInt(100) * ONE,
		cyWETH: BigInt(200) * ONE
	},
	shares: {
		cysFLR: {
			percentageShare: ONE / 2n,
			rewardsAmount: BigInt(10) * ONE
		},
		cyWETH: {
			percentageShare: ONE / 2n,
			rewardsAmount: BigInt(10) * ONE
		},
		totalRewards: BigInt(20) * ONE
	},
	transfers: {
		in: [],
		out: []
	},
	liquidityChanges: []
};

describe('AccountSummary Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should display `not eligible for rewards` text if account not eligible', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue({
			...mockStats,
			eligibleBalances: {
				cysFLR: BigInt(0),
				cyWETH: BigInt(0)
			}
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

	it('should display basic stats', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

		render(AccountSummary, { props: { account: '0x1234567890123456789012345678901234567890' } });

		await waitFor(() => {
			expect(screen.getByTestId('net-cysflr-value')).toHaveTextContent('100');
			expect(screen.getByTestId('net-cyweth-value')).toHaveTextContent('200');
			expect(screen.getByTestId('cysflr-rewards-value')).toHaveTextContent('10');
			expect(screen.getByTestId('cysflr-rewards-percentage')).toHaveTextContent('50%');
			expect(screen.getByTestId('cyweth-rewards-value')).toHaveTextContent('10');
			expect(screen.getByTestId('cyweth-rewards-percentage')).toHaveTextContent('50%');
			expect(screen.getByTestId('total-rewards-value')).toHaveTextContent('20');
		});
	});
});

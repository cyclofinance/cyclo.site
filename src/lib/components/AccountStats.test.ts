import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
import AccountSummary from './AccountSummary.svelte';
import type { AccountStats, CyToken } from '$lib/types';
import { ONE } from '$lib/constants';
import type { Hex } from 'viem';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

const { mockTokensStore } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const { writable } = require('svelte/store');
	const tokens: CyToken[] = [
		{
			name: 'cysFLR',
			address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
			underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as Hex,
			underlyingSymbol: 'sFLR',
			receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' as Hex,
			symbol: 'cysFLR',
			decimals: 18
		},
		{
			name: 'cyWETH',
			address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
			underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex,
			underlyingSymbol: 'WETH',
			receiptAddress: '0xBE2615A0fcB54A49A1eB472be30d992599FE0968' as Hex,
			symbol: 'cyWETH',
			decimals: 18
		}
	];
	return {
		mockTokensStore: writable(tokens)
	};
});

vi.mock('$lib/stores', () => ({
	tokens: mockTokensStore
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
	} as unknown as AccountStats['shares'],
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

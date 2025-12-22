import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import AccountStatus from './AccountStatus.svelte';
import type { AccountStats, CyToken } from '$lib/types';
import type { Hex } from 'viem';

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

const { mockTokensStore, mockSelectedNetworkStore } = vi.hoisted(() => {
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
		mockTokensStore: writable(tokens),
		mockSelectedNetworkStore: writable({ explorerUrl: 'https://flarescan.com' })
	};
});

vi.mock('$lib/stores', () => ({
	tokens: mockTokensStore,
	selectedNetwork: mockSelectedNetworkStore
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
	} as unknown as AccountStats['shares'],
	transfers: {
		in: [
			{
				id: '1',
				blockNumber: 1,
				fromIsApprovedSource: true,
				transactionHash: 'hash1',
				blockTimestamp: '1000',
				tokenAddress: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
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
				tokenAddress: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
				from: { id: '0x2345678901234567890123456789012345678901' },
				to: { id: '0x1234567890123456789012345678901234567890' },
				value: '200000000000000000000'
			}
		]
	},
	liquidityChanges: []
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
				cyWETH: BigInt(0)
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

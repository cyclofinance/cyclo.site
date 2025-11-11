import { render, screen, waitFor } from '@testing-library/svelte';
import Unlock from './Unlock.svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { mockConnectedStore, mockSignerAddressStore } from '$lib/mocks/mockStores';
import { refreshAllReceipts } from '$lib/queries/refreshAllReceipts';
import userEvent from '@testing-library/user-event';
import type { CyToken, Receipt } from '$lib/types';
import { writable } from 'svelte/store';

const { mockBalancesStore } = await vi.hoisted(() => import('$lib/mocks/mockStores'));

vi.mock('$lib/queries/getReceipts', () => ({
	getSingleTokenReceipts: vi.fn()
}));

vi.mock('$lib/queries/refreshAllReceipts', () => ({
	refreshAllReceipts: vi.fn()
}));

vi.mock('$lib/balancesStore', async () => {
	return {
		default: {
			...mockBalancesStore,
			refreshSwapQuote: vi.fn(),
			refreshBalances: vi.fn(),
			refreshPrices: vi.fn(),
			refreshDepositPreviewSwapValue: vi.fn()
		}
	};
});

const selectedCyToken: CyToken = {
	name: 'cysFLR',
	address: '0x00000000000000000000000000000000cdef1234',
	underlyingAddress: '0x000000000000000000000000000000000abc1234',
	underlyingSymbol: 'sFLR',
	receiptAddress: '0x0000000000000000000000000000000000eeff56',
	symbol: 'cysFLR',
	decimals: 18,
	chainId: 14,
	networkKey: 'flare',
	networkName: 'Flare'
};

const receipts: Receipt[] = [
	{
		balance: 36928000000000000n,
		chainId: '14',
		readableFlrPerReceipt: '43.32756',
		readableTokenId: '0.02308',
		readableTotalsFlr: '1.60000',
		tokenAddress: '0x6D6111ab02800aC64f66456874add77F44529a90',
		tokenId: '23080000000000000',
		token: 'cysFLR',
		totalsFlr: 536928000000000000n
	},
	{
		balance: 36928000000000000n,
		chainId: '14',
		readableFlrPerReceipt: '43.32756',
		readableTokenId: '0.02308',
		readableTotalsFlr: '1.60000',
		tokenAddress: '0x5D6111ab02800aC64f66456874add77F44529a90',
		tokenId: '23080000000000000',
		token: 'cyWETH',
		totalsFlr: 536928000000000000n
	}
];

vi.mock('$lib/store', async () => {
	return {
		default: {
			myReceipts: writable(receipts),
			selectedCyToken: writable(selectedCyToken)
		}
	};
});

describe('Unlock Component', () => {
beforeEach(async () => {
		vi.clearAllMocks();
		const store = await import('$lib/stores');
		store.myReceipts.set([]);
	vi.mocked(refreshAllReceipts).mockImplementation(async (_signerAddress, setLoading) => {
		if (setLoading) setLoading(false);
		return [];
	});
		mockBalancesStore.mockSetSubscribeValue(
			'Ready',
			false,
			{
				cyWETH: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				},
				cysFLR: {
					lockPrice: BigInt(1),
					price: BigInt(0),
					supply: BigInt(1),
					underlyingTvl: BigInt(1),
					usdTvl: BigInt(1000000)
				},
				cyFXRP: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				}
			},
			{
				cyWETH: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				},
				cysFLR: {
					signerBalance: BigInt(1000000000000000000),
					signerUnderlyingBalance: BigInt(1000000000000000000)
				},
				cyFXRP: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				}
			},
			{
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		);
	});

	it('should show connect wallet button when wallet is not connected', () => {
		mockConnectedStore.mockSetSubscribeValue(false);
		mockSignerAddressStore.mockSetSubscribeValue('');
		render(Unlock);

		expect(screen.getByText('CONNECT WALLET TO VIEW RECEIPTS')).toBeInTheDocument();
	});

	it('should display cysFLR balance correctly when wallet is connected', async () => {
		mockConnectedStore.mockSetSubscribeValue(true);
		mockSignerAddressStore.mockSetSubscribeValue('mockWalletAddress');
		render(Unlock);

		await waitFor(() => {
			const balanceText = screen.getByTestId('cysflr-balance');
			expect(balanceText).toBeInTheDocument();
			expect(balanceText).toHaveTextContent('1');
			expect(balanceText).toHaveTextContent('cysFLR');
		});
	});

	it('should show loading state while fetching receipts', async () => {
		vi.mocked(refreshAllReceipts).mockImplementation(() => new Promise(() => {}));
		render(Unlock);

		await waitFor(() => {
			expect(screen.getByText('LOADING...')).toBeInTheDocument();
		});
	});

	it('should display receipts table when receipts are available', async () => {
		mockSignerAddressStore.mockSetSubscribeValue('0xmockAddress');
		mockConnectedStore.mockSetSubscribeValue(true);

		const { refreshAllReceipts } = await import('$lib/queries/refreshAllReceipts');
		vi.mocked(refreshAllReceipts).mockImplementation(async (signerAddress, setLoading) => {
			const store = await import('$lib/stores');
			store.myReceipts.set(receipts);
			if (setLoading) setLoading(false);
			return receipts;
		});

		render(Unlock);

		await waitFor(() => {
			expect(screen.queryByText('NO cysFLR RECEIPTS FOUND...')).not.toBeInTheDocument();
			expect(screen.queryByText('LOADING...')).not.toBeInTheDocument();
			expect(screen.getByText('1.60000')).toBeInTheDocument();
		});
	});

	it('should show "NO RECEIPTS FOUND" message when no receipts are available', async () => {
		vi.mocked(refreshAllReceipts).mockImplementation((signerAddress, setLoading) => {
			if (setLoading) setLoading(false);
			return Promise.resolve([]);
		});

		render(Unlock);

		await waitFor(() => {
			expect(screen.getByText('NO cysFLR RECEIPTS FOUND...')).toBeInTheDocument();
		});
	});

	it('should display correct token name when a different token is selected', async () => {
		vi.mocked(refreshAllReceipts).mockImplementation((signerAddress, setLoading) => {
			if (setLoading) setLoading(false);
			return Promise.resolve([]);
		});

		render(Unlock);

		// Simulate selecting a different token
		const newTokenButton = screen.getByTestId('cyWETH-button');
		await userEvent.click(newTokenButton);

		await waitFor(() => {
			expect(screen.queryByText('NO cyWETH RECEIPTS FOUND...')).toBeInTheDocument();
		});
	});
});

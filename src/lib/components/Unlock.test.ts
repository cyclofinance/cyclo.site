import { render, screen, waitFor } from '@testing-library/svelte';
import Unlock from './Unlock.svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { mockConnectedStore, mockSignerAddressStore } from '$lib/mocks/mockStores';
import { refreshAllReceipts } from '$lib/queries/refreshAllReceipts';
import userEvent from '@testing-library/user-event';
import type { CyToken, Receipt } from '$lib/types';
import type { Hex } from 'viem';

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

const {
	mockTokensStore,
	mockSelectedCyTokenStore,
	mockMyReceiptsStore,
	mockSelectedNetworkStore,
	selectedCyToken,
	receipts
} = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { flare } = require('@wagmi/core/chains');

	const selectedCyToken: CyToken = {
		name: 'cysFLR',
		address: '0xcdef1234abcdef5678',
		underlyingAddress: '0xabcd1234',
		underlyingSymbol: 'sFLR',
		receiptAddress: '0xeeff5678',
		symbol: 'cysFLR',
		decimals: 18,
		chainId: 14,
		networkName: 'Flare',
		active: true
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

	const tokens: CyToken[] = [
		selectedCyToken,
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
		},
		{
			name: 'cyFXRP.ftso',
			address: '0xF23595Ede14b54817397B1dAb899bA061BdCe7b5' as Hex,
			underlyingAddress: '0xAd552A648C74D49E10027AB8a618A3ad4901c5bE' as Hex,
			underlyingSymbol: 'FXRP',
			receiptAddress: '0xC46600cEbD84Ed2FE60Ec525dF13E341D24642f2' as Hex,
			symbol: 'cyFXRP.ftso',
			decimals: 6,
			chainId: 14,
			networkName: 'Flare',
			active: true
		}
	];

	const mockNetworkConfig = {
		key: 'flare',
		chain: flare,
		wFLRAddress: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as Hex,
		quoterAddress: '0x5B5513c55fd06e2658010c121c37b07fC8e8B705' as Hex,
		cusdxAddress: '0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8' as Hex,
		usdcAddress: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as Hex,
		explorerApiUrl: 'https://flare-explorer.flare.network/api',
		explorerUrl: 'https://flarescan.com',
		orderbookSubgraphUrl:
			'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
		rewardsSubgraphUrl:
			'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-12-11-ab43/gn',
		tokens: tokens
	};

	return {
		mockTokensStore: writable(tokens),
		mockSelectedCyTokenStore: writable(selectedCyToken),
		mockMyReceiptsStore: writable([]),
		mockSelectedNetworkStore: writable(mockNetworkConfig),
		selectedCyToken,
		receipts
	};
});

vi.mock('$lib/stores', () => ({
	tokens: mockTokensStore,
	selectedCyToken: mockSelectedCyTokenStore,
	myReceipts: mockMyReceiptsStore,
	selectedNetwork: mockSelectedNetworkStore
}));

describe('Unlock Component', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		mockMyReceiptsStore.set([]);
		mockSelectedCyTokenStore.set(selectedCyToken);
		vi.mocked(refreshAllReceipts).mockImplementation(async (signerAddress, setLoading) => {
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
			expect(balanceText).toHaveTextContent('1.0');
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
		mockSignerAddressStore.mockSetSubscribeValue('0xmockAddress');
		mockConnectedStore.mockSetSubscribeValue(true);

		vi.mocked(refreshAllReceipts).mockImplementation(async (signerAddress, setLoading) => {
			if (setLoading) setLoading(false);
			return [];
		});

		render(Unlock);

		await waitFor(() => {
			expect(screen.getByText('NO cysFLR RECEIPTS FOUND...')).toBeInTheDocument();
		});
	});

	it('should display correct token name when a different token is selected', async () => {
		mockSignerAddressStore.mockSetSubscribeValue('0xmockAddress');
		mockConnectedStore.mockSetSubscribeValue(true);

		vi.mocked(refreshAllReceipts).mockImplementation(async (signerAddress, setLoading) => {
			if (setLoading) setLoading(false);
			return [];
		});

		render(Unlock);

		// Wait for initial render
		await waitFor(() => {
			expect(screen.getByText('NO cysFLR RECEIPTS FOUND...')).toBeInTheDocument();
		});

		// Simulate selecting a different token
		const newTokenButton = screen.getByTestId('cyWETH-button');
		await userEvent.click(newTokenButton);

		await waitFor(() => {
			expect(screen.getByText('NO cyWETH RECEIPTS FOUND...')).toBeInTheDocument();
		});
	});
});

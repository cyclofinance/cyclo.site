import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import transactionStore from './transactionStore';
import { getDcaDeploymentArgs, type DcaDeploymentArgs } from './trade/getDeploymentArgs';
import { sendTransaction } from '@wagmi/core';
import { getTransactionAddOrders } from '@rainlanguage/orderbook/js_api';
import { mockWagmiConfigStore } from '$lib/mocks/mockStores';
import { flare } from '@wagmi/core/chains';
import { DataFetcher } from 'sushi';
// Mock the dependencies, not the module under test
vi.mock('./trade/getDeploymentArgs', () => ({
	getDcaDeploymentArgs: vi.fn()
}));

vi.mock('./balancesStore', () => ({
	default: {
		refreshBalances: vi.fn().mockResolvedValue('mocked balance') // Mock the refreshBalances function
	}
}));

vi.mock('../generated', () => ({
	readErc20BalanceOf: vi.fn(),
	readErc20Allowance: vi.fn(),
	writeErc20Approve: vi.fn(),
	writeErc20PriceOracleReceiptVaultDeposit: vi.fn(),
	writeErc20PriceOracleReceiptVaultRedeem: vi.fn(),
	readErc1155IsApprovedForAll: vi.fn(),
	writeErc1155SetApprovalForAll: vi.fn()
}));

vi.mock('@rainlanguage/orderbook/js_api', () => ({
	getTransactionAddOrders: vi.fn()
}));

vi.mock('svelte/store', async () => {
	const actual = await vi.importActual('svelte/store');
	return {
		...actual,
		get: vi.fn().mockImplementation((store) => {
			if (store === transactionStore) return transactionStore;
			return mockWagmiConfigStore;
		})
	};
});

// Add this back
vi.mock('@wagmi/core', () => ({
	sendTransaction: vi.fn(),
	waitForTransactionReceipt: vi.fn()
}));

describe('transactionStore.handleDeployDca', () => {
	const mockOptions = {
		selectedCyToken: {
			symbol: 'cyTEST',
			address: '0xabc123' as `0x${string}`,
			name: 'Cyclo TEST',
			decimals: 18,
			underlyingSymbol: 'TEST',
			underlyingAddress: '0xdef456' as `0x${string}`,
			receiptAddress: '0xfed789' as `0x${string}`
		},
		selectedToken: {
			address: '0xdef456' as `0x${string}`,
			symbol: 'TEST',
			name: 'Test Token',
			decimals: 18
		},
		selectedBuyOrSell: 'Buy' as const,
		selectedPeriodUnit: 'Days' as const,
		selectedPeriod: '1',
		selectedAmountToken: {
			address: '0xdef456' as `0x${string}`,
			symbol: 'TEST',
			name: 'Test Token',
			decimals: 18
		},
		selectedAmount: BigInt(1000000000000000000), // 1 TEST
		selectedBaseline: '1.5'
	};

	const mockDataFetcher = new DataFetcher(flare.id);

	const mockDeploymentArgs = {
		deploymentCalldata: '0xabcdef',
		orderbookAddress: '0x1234',
		approvals: [
			{
				calldata: '0xapproval',
				token: '0xtoken',
				symbol: 'TEST'
			}
		],
		chainId: 14
	};

	beforeEach(() => {
		vi.clearAllMocks();
		transactionStore.reset();

		vi.mocked(getDcaDeploymentArgs).mockResolvedValue({
			deploymentArgs: mockDeploymentArgs,
			outputToken: { symbol: 'TEST', name: 'Test Token', decimals: 18, address: '0xdef456' }
		});

		vi.mocked(sendTransaction).mockResolvedValue('0xtxhash');

		vi.mocked(getTransactionAddOrders).mockResolvedValue([
			{
				order: {
					orderHash: '0xorderhash'
				}
			}
		]);

		// Mock setInterval and clearInterval
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should call getDcaDeploymentArgs with the correct options', async () => {
		const deployPromise = transactionStore.handleDeployDca(
			mockOptions as DcaDeploymentArgs,
			mockDataFetcher
		);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(getDcaDeploymentArgs).toHaveBeenCalledWith(mockOptions, mockDataFetcher);
	});

	it('should call sendTransaction for approval and deployment', async () => {
		const deployPromise = transactionStore.handleDeployDca(
			mockOptions as DcaDeploymentArgs,
			mockDataFetcher
		);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(sendTransaction).toHaveBeenCalledTimes(2);
		expect(sendTransaction).toHaveBeenCalledWith(mockWagmiConfigStore, {
			data: '0xapproval',
			to: '0xtoken'
		});
		expect(sendTransaction).toHaveBeenCalledWith(mockWagmiConfigStore, {
			data: '0xabcdef',
			to: '0x1234'
		});
	});

	it('should skip approval if no approvals are needed', async () => {
		vi.mocked(getDcaDeploymentArgs).mockResolvedValueOnce({
			deploymentArgs: {
				...mockDeploymentArgs,
				approvals: []
			},
			outputToken: { symbol: 'TEST', name: 'Test Token', decimals: 18, address: '0xdef456' }
		});

		const deployPromise = transactionStore.handleDeployDca(
			mockOptions as DcaDeploymentArgs,
			mockDataFetcher
		);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(sendTransaction).toHaveBeenCalledTimes(1);
	});

	it('should call transactionSuccess with the correct arguments', async () => {
		const deployPromise = transactionStore.handleDeployDca(
			mockOptions as DcaDeploymentArgs,
			mockDataFetcher
		);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await vi.advanceTimersByTimeAsync(2000); // Advance to trigger the interval
		await deployPromise;

		expect(getTransactionAddOrders).toHaveBeenCalledWith(
			'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
			'0xtxhash'
		);
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import transactionStore from './transactionStore';
import { getDsfDeploymentArgs, type DsfDeploymentArgs } from './trade/getDeploymentArgs';
import { sendTransaction } from '@wagmi/core';
import { getTransactionAddOrders } from '@rainlanguage/orderbook/js_api';
import { mockWagmiConfigStore } from '$lib/mocks/mockStores';
import { flare } from '@wagmi/core/chains';
import { DataFetcher } from 'sushi';

// Mock the dependencies, not the module under test
vi.mock('./trade/getDeploymentArgs', () => ({
	getDsfDeploymentArgs: vi.fn()
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

const { mockSelectedNetworkStore, MOCKED_ORDERBOOK_SUBGRAPH_URL } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { flare } = require('@wagmi/core/chains');
	const MOCKED_ORDERBOOK_SUBGRAPH_URL =
		'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn';
	const mockNetworkConfig = {
		key: 'flare',
		chain: flare,
		orderbookSubgraphUrl: MOCKED_ORDERBOOK_SUBGRAPH_URL
	};
	const mockSelectedNetworkWritable = writable(mockNetworkConfig);
	const mockSelectedNetworkStore = {
		subscribe: mockSelectedNetworkWritable.subscribe,
		set: mockSelectedNetworkWritable.set
	};
	return { mockSelectedNetworkStore, MOCKED_ORDERBOOK_SUBGRAPH_URL };
});

vi.mock('./stores', () => ({
	myReceipts: { set: vi.fn() },
	selectedNetwork: mockSelectedNetworkStore
}));

vi.mock('svelte/store', async () => {
	const actual = await vi.importActual('svelte/store');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { flare } = require('@wagmi/core/chains');
	return {
		...actual,
		get: vi.fn().mockImplementation((store) => {
			if (store === transactionStore) return transactionStore;
			if (store === mockSelectedNetworkStore) {
				return {
					key: 'flare',
					chain: flare,
					orderbookSubgraphUrl: MOCKED_ORDERBOOK_SUBGRAPH_URL
				};
			}
			return mockWagmiConfigStore;
		})
	};
});

// Add this back
vi.mock('@wagmi/core', () => ({
	sendTransaction: vi.fn(),
	waitForTransactionReceipt: vi.fn()
}));

describe('transactionStore.handleDeployDsf', () => {
	const mockOptions: DsfDeploymentArgs = {
		amountToken: {
			address: '0xabc123' as `0x${string}`,
			symbol: 'USDC',
			name: 'USD Coin',
			decimals: 6
		},
		rotateToken: {
			address: '0xdef456' as `0x${string}`,
			symbol: 'cysFLR',
			name: 'Cyclo sFLR',
			decimals: 18
		},
		isAmountTokenFastExit: false,
		isRotateTokenFastExit: true,
		initialPrice: '1.5',
		maxTradeAmount: BigInt(1000000000), // 1000 USDC (6 decimals)
		minTradeAmount: BigInt(100000), // 0.1 USDC (6 decimals)
		nextTradeMultiplier: '1.01',
		costBasisMultiplier: '1',
		timePerEpoch: '3600',
		amountTokenInputVaultId: undefined,
		rotateTokenInputVaultId: undefined,
		amountTokenOutputVaultId: undefined,
		rotateTokenOutputVaultId: undefined,
		amountTokenDepositAmount: BigInt(500000000), // 500 USDC
		rotateTokenDepositAmount: BigInt(1000000000000000000), // 1 cysFLR
		selectedNetworkKey: 'flare'
	};

	const mockDataFetcher = new DataFetcher(flare.id);

	const mockDeploymentArgs = {
		deploymentCalldata: '0xabcdef',
		orderbookAddress: '0x1234',
		approvals: [
			{
				calldata: '0xapproval1',
				token: '0xtoken1',
				symbol: 'USDC'
			},
			{
				calldata: '0xapproval2',
				token: '0xtoken2',
				symbol: 'cysFLR'
			}
		],
		chainId: 14
	};

	beforeEach(() => {
		vi.clearAllMocks();
		transactionStore.reset();

		vi.mocked(getDsfDeploymentArgs).mockResolvedValue({
			deploymentArgs: mockDeploymentArgs
		});

		vi.mocked(sendTransaction).mockResolvedValue('0xtxhash');

		vi.mocked(getTransactionAddOrders).mockResolvedValue([
			{
				order: {
					orderHash: '0xorderhash',
					orderbook: {
						id: '0xorderbookid'
					}
				}
			}
		]);

		// Mock setInterval and clearInterval
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should call getDsfDeploymentArgs with the correct options', async () => {
		const deployPromise = transactionStore.handleDeployDsf(mockOptions, mockDataFetcher);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(getDsfDeploymentArgs).toHaveBeenCalledWith(mockOptions, mockDataFetcher);
	});

	it('should call sendTransaction for all approvals and deployment', async () => {
		const deployPromise = transactionStore.handleDeployDsf(mockOptions, mockDataFetcher);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		// Should be called 3 times: 2 approvals + 1 deployment
		expect(sendTransaction).toHaveBeenCalledTimes(3);
		expect(sendTransaction).toHaveBeenCalledWith(mockWagmiConfigStore, {
			data: '0xapproval1',
			to: '0xtoken1'
		});
		expect(sendTransaction).toHaveBeenCalledWith(mockWagmiConfigStore, {
			data: '0xapproval2',
			to: '0xtoken2'
		});
		expect(sendTransaction).toHaveBeenCalledWith(mockWagmiConfigStore, {
			data: '0xabcdef',
			to: '0x1234'
		});
	});

	it('should skip approvals if no approvals are needed', async () => {
		vi.mocked(getDsfDeploymentArgs).mockResolvedValueOnce({
			deploymentArgs: {
				...mockDeploymentArgs,
				approvals: []
			}
		});

		const deployPromise = transactionStore.handleDeployDsf(mockOptions, mockDataFetcher);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		// Should only be called once for deployment
		expect(sendTransaction).toHaveBeenCalledTimes(1);
		expect(sendTransaction).toHaveBeenCalledWith(mockWagmiConfigStore, {
			data: '0xabcdef',
			to: '0x1234'
		});
	});

	it('should handle single approval correctly', async () => {
		vi.mocked(getDsfDeploymentArgs).mockResolvedValueOnce({
			deploymentArgs: {
				...mockDeploymentArgs,
				approvals: [
					{
						calldata: '0xapproval1',
						token: '0xtoken1',
						symbol: 'USDC'
					}
				]
			}
		});

		const deployPromise = transactionStore.handleDeployDsf(mockOptions, mockDataFetcher);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		// Should be called 2 times: 1 approval + 1 deployment
		expect(sendTransaction).toHaveBeenCalledTimes(2);
	});

	it('should call transactionSuccess with the correct arguments', async () => {
		const deployPromise = transactionStore.handleDeployDsf(mockOptions, mockDataFetcher);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await vi.advanceTimersByTimeAsync(2000); // Advance to trigger the interval
		await deployPromise;

		expect(getTransactionAddOrders).toHaveBeenCalledWith(MOCKED_ORDERBOOK_SUBGRAPH_URL, '0xtxhash');
	});

	it('should handle all DSF-specific options correctly', async () => {
		const optionsWithVaultIds: DsfDeploymentArgs = {
			...mockOptions,
			amountTokenInputVaultId: '0xvault1' as `0x${string}`,
			rotateTokenInputVaultId: '0xvault2' as `0x${string}`,
			amountTokenOutputVaultId: '0xvault3' as `0x${string}`,
			rotateTokenOutputVaultId: '0xvault4' as `0x${string}`
		};

		const deployPromise = transactionStore.handleDeployDsf(optionsWithVaultIds, mockDataFetcher);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(getDsfDeploymentArgs).toHaveBeenCalledWith(optionsWithVaultIds, mockDataFetcher);
	});

	it('should handle fast exit flags correctly', async () => {
		const optionsWithFastExit: DsfDeploymentArgs = {
			...mockOptions,
			isAmountTokenFastExit: true,
			isRotateTokenFastExit: true
		};

		const deployPromise = transactionStore.handleDeployDsf(optionsWithFastExit, mockDataFetcher);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(getDsfDeploymentArgs).toHaveBeenCalledWith(optionsWithFastExit, mockDataFetcher);
	});

	it('should handle zero deposit amounts correctly', async () => {
		const optionsWithZeroDeposits: DsfDeploymentArgs = {
			...mockOptions,
			amountTokenDepositAmount: BigInt(0),
			rotateTokenDepositAmount: BigInt(0)
		};

		const deployPromise = transactionStore.handleDeployDsf(
			optionsWithZeroDeposits,
			mockDataFetcher
		);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(getDsfDeploymentArgs).toHaveBeenCalledWith(optionsWithZeroDeposits, mockDataFetcher);
	});

	it('should handle custom advanced options correctly', async () => {
		const optionsWithCustomAdvanced: DsfDeploymentArgs = {
			...mockOptions,
			nextTradeMultiplier: '1.05',
			costBasisMultiplier: '1.02',
			timePerEpoch: '7200'
		};

		const deployPromise = transactionStore.handleDeployDsf(
			optionsWithCustomAdvanced,
			mockDataFetcher
		);

		// Advance timers to allow async operations to complete
		await vi.runAllTimersAsync();
		await deployPromise;

		expect(getDsfDeploymentArgs).toHaveBeenCalledWith(optionsWithCustomAdvanced, mockDataFetcher);
	});
});

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { get } from 'svelte/store';
import cysFlrBalanceStore from './balancesStore';
import {
	readErc20BalanceOf,
	simulateErc20PriceOracleReceiptVaultPreviewDeposit,
	readErc20TotalSupply
} from '../generated';
import balancesStore from './balancesStore';
import { getBlock, type Config } from '@wagmi/core';
import { waitFor } from '@testing-library/svelte';
const { mockWagmiConfigStore } = await vi.hoisted(() => import('./mocks/mockStores'));

vi.mock('../generated', () => ({
	readErc20BalanceOf: vi.fn(),
	simulateQuoterQuoteExactOutputSingle: vi.fn(),
	simulateErc20PriceOracleReceiptVaultPreviewDeposit: vi.fn(),
	readErc20TotalSupply: vi.fn()
}));

vi.mock('viem', async () => {
	const actual = await vi.importActual('viem');
	return {
		...actual,
		getContract: vi.fn(() => ({
			read: {
				balanceOf: vi.fn().mockResolvedValue(BigInt(3e18)),
				totalSupply: vi.fn().mockResolvedValue(BigInt(1000))
			},
			simulate: {
				previewDeposit: vi.fn().mockResolvedValue({ result: [BigInt(1000)] })
			}
		})),
		createPublicClient: vi.fn()
	};
});

vi.mock('@wagmi/core', () => ({
	getBlock: vi.fn()
}));

describe('cysFlrBalanceStore', () => {
	const mockSignerAddress = '0x1234567890abcdef';
	const mocksFlrAddress = '0xabcdef1234567890';
	const mockCysFlrAddress = '0xabcdefabcdef1234';
	const mockQuoterAddress = '0x1234567890abcdef';
	const mockCusdxAddress = '0xabcdef1234567890';

	const { reset, refreshBalances, refreshPrices } = balancesStore;

	beforeEach(() => {
		vi.resetAllMocks();
		reset();
	});

	it('should initialize with the correct default state', () => {
		expect(get(cysFlrBalanceStore)).toEqual({
			cysFlrBalance: BigInt(0),
			sFlrBalance: BigInt(0),
			lockPrice: BigInt(0),
			status: 'Checking',
			cysFlrUsdPrice: BigInt(0),
			cysFlrSupply: BigInt(0),
			TVLsFlr: BigInt(0),
			TVLUsd: BigInt(0),
			swapQuotes: {
				cysFlrOutput: BigInt(0),
				cusdxOutput: BigInt(0)
			}
		});
	});

	it('should refresh sFlrBalance correctly', async () => {
		(getBlock as Mock).mockResolvedValue({ number: BigInt(1000) });
		const mocksFlrBalance = BigInt(1000);
		(readErc20BalanceOf as Mock).mockResolvedValue(mocksFlrBalance);

		await refreshBalances(
			mockWagmiConfigStore as unknown as Config,
			mocksFlrAddress,
			mockCysFlrAddress,
			mockSignerAddress
		);

		const storeValue = get(cysFlrBalanceStore);
		expect(storeValue.sFlrBalance).toBe(mocksFlrBalance);
		expect(storeValue.status).toBe('Ready');
	});

	it('should refresh cysFLRBalance correctly', async () => {
		const mockCysFlrBalance = BigInt(2000);
		(readErc20BalanceOf as Mock).mockResolvedValue(mockCysFlrBalance);

		await refreshBalances(
			mockWagmiConfigStore as unknown as Config,
			mocksFlrAddress,
			mockCysFlrAddress,
			mockSignerAddress
		);

		const storeValue = get(cysFlrBalanceStore);
		expect(storeValue.cysFlrBalance).toBe(mockCysFlrBalance);
		expect(storeValue.status).toBe('Ready');
	});

	it('should refresh prices correctly', async () => {
		(simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock).mockResolvedValue({
			result: BigInt(1000)
		});

		(readErc20BalanceOf as Mock).mockResolvedValue(BigInt(3e18));
		(readErc20TotalSupply as Mock).mockResolvedValue(BigInt(1000));

		await refreshPrices(
			mockWagmiConfigStore as unknown as Config,
			mockCysFlrAddress,
			mockQuoterAddress,
			mockCusdxAddress,
			mocksFlrAddress
		);

		const storeValue = get(cysFlrBalanceStore);
		expect(storeValue.cysFlrSupply).toBe(BigInt(1000));
		await waitFor(() => expect(storeValue.TVLUsd).toBe(BigInt(3000n)));
		expect(storeValue.status).toBe('Ready');
	});

	it('should reset the store to its initial state', () => {
		const mockWFlrBalance = BigInt(1000);
		(readErc20BalanceOf as Mock).mockResolvedValue(mockWFlrBalance);
		refreshBalances(
			mockWagmiConfigStore as unknown as Config,
			mocksFlrAddress,
			mockCysFlrAddress,
			mockSignerAddress
		);

		reset();

		expect(get(cysFlrBalanceStore)).toEqual({
			cysFlrBalance: BigInt(0),
			sFlrBalance: BigInt(0),
			lockPrice: BigInt(0),
			status: 'Checking',
			cysFlrUsdPrice: BigInt(0),
			cysFlrSupply: BigInt(0),
			TVLsFlr: BigInt(0),
			TVLUsd: BigInt(0),
			swapQuotes: {
				cysFlrOutput: BigInt(0),
				cusdxOutput: BigInt(0)
			}
		});
	});
});

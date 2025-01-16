import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { get } from 'svelte/store';
import {
	readErc20BalanceOf,
	simulateQuoterQuoteExactOutputSingle,
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

vi.mock('@wagmi/core', () => ({
	getBlock: vi.fn()
}));

describe('balancesStore', () => {
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
		expect(get(balancesStore)).toEqual({
			balances: {
				cyWETH: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				},
				cysFLR: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				}
			},
			stats: {
				cyWETH: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				},
				cysFLR: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				}
			},
			statsLoading: true,
			status: 'Checking',
			swapQuotes: {
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		});
	});
	it('should refresh cysFLR balances correctly', async () => {
		(getBlock as Mock).mockResolvedValue({ number: BigInt(1000) });
		const mocksFlrBalance = BigInt(1000);
		(readErc20BalanceOf as Mock).mockResolvedValue(mocksFlrBalance);

		await refreshBalances(mockWagmiConfigStore as unknown as Config, mockSignerAddress);

		const storeValue = get(balancesStore);
		expect(storeValue.balances.cysFLR.signerBalance).toBe(mocksFlrBalance);
		expect(storeValue.balances.cysFLR.signerUnderlyingBalance).toBe(mocksFlrBalance);
		expect(storeValue.status).toBe('Ready');
	});

	it('should refresh cyWETH Balance correctly', async () => {
		const mockCyWETHBalance = BigInt(2000);
		(readErc20BalanceOf as Mock).mockResolvedValue(mockCyWETHBalance);

		await refreshBalances(mockWagmiConfigStore as unknown as Config, mockSignerAddress);

		const storeValue = get(balancesStore);
		expect(storeValue.balances.cyWETH.signerBalance).toBe(mockCyWETHBalance);
		expect(storeValue.balances.cyWETH.signerUnderlyingBalance).toBe(mockCyWETHBalance);
		expect(storeValue.status).toBe('Ready');
	});

	it('should refresh prices correctly', async () => {
		const mockCysFlrUsdPriceReturn = { result: [BigInt(2000)] };
		(simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock).mockResolvedValue({
			result: BigInt(1000)
		});
		(simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue(mockCysFlrUsdPriceReturn);
		(readErc20BalanceOf as Mock).mockResolvedValue(BigInt(3e18));
		(readErc20TotalSupply as Mock).mockResolvedValue(BigInt(1000));

		await refreshPrices(
			mockWagmiConfigStore as unknown as Config,
			mockCysFlrAddress,
			mockQuoterAddress,
			mockCusdxAddress,
			mocksFlrAddress
		);

		const storeValue = get(balancesStore);
		expect(storeValue.cysFlrUsdPrice).toBe(mockCysFlrUsdPriceReturn.result[0]);
		expect(storeValue.cysFlrSupply).toBe(BigInt(1000));
		await waitFor(() => expect(storeValue.TVLUsd).toBe(BigInt(3000n)));
		expect(storeValue.status).toBe('Ready');
	});

	it('should reset the store to its initial state', () => {
		const mockWFlrBalance = BigInt(1000);
		(readErc20BalanceOf as Mock).mockResolvedValue(mockWFlrBalance);
		refreshBalances(mockWagmiConfigStore as unknown as Config, mockSignerAddress);

		reset();

		expect(get(balancesStore)).toEqual({
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

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
import type { CyToken } from '$lib/types';

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
			swapQuoteLoading: false,
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

		const mockToken: CyToken = {
			name: 'cysFLR',
			address: '0xcdef1234abcdef5678',
			underlyingAddress: '0xabcd1234',
			underlyingSymbol: 'sFLR',
			receiptAddress: '0xeeff5678',
			symbol: 'cysFLR',
			decimals: 18
		};

		await refreshPrices(mockWagmiConfigStore as unknown as Config, mockToken);

		const storeValue = get(balancesStore);
		expect(storeValue.stats.cysFLR.lockPrice).toBe(BigInt(1000n));
		expect(storeValue.stats.cysFLR.supply).toBe(BigInt(1000n));
		expect(storeValue.stats.cysFLR.underlyingTvl).toBe(BigInt(3e18));
		expect(storeValue.stats.cysFLR.usdTvl).toBe((BigInt(3e18) * BigInt(1000n)) / BigInt(1e18));
		expect(storeValue.status).toBe('Ready');
	});

	it('should reset the store to its initial state', () => {
		const mockWFlrBalance = BigInt(1000);
		(readErc20BalanceOf as Mock).mockResolvedValue(mockWFlrBalance);
		refreshBalances(mockWagmiConfigStore as unknown as Config, mockSignerAddress);

		reset();

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
			swapQuoteLoading: false,
			status: 'Checking',
			swapQuotes: {
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		});
	});
});

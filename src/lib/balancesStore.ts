import type { Config } from '@wagmi/core';
import {
	readErc20BalanceOf,
	readErc20TotalSupply,
	simulateErc20PriceOracleReceiptVaultPreviewDeposit,
	simulateQuoterQuoteExactInputSingle,
	simulateQuoterQuoteExactOutputSingle
} from '../generated';
import { get, writable } from 'svelte/store';
import type { Hex } from 'viem';
import { ZeroAddress } from 'ethers';
import type { CyToken } from './types';
import { quoterAddress, tokens } from './stores';

interface StatsState {
	status: string;
	statsLoading: boolean;
	stats: {
		[key: string]: {
			supply: bigint;
			price: bigint;
			lockPrice: bigint;
			underlyingTvl: bigint;
			usdTvl: bigint;
		};
	};
	balances: {
		[key: string]: {
			signerBalance: bigint;
			signerUnderlyingBalance: bigint;
		};
	};
	swapQuotes: {
		cyTokenOutput: bigint;
		cusdxOutput: bigint;
	};
}

const initialState: StatsState = {
	status: 'Checking',
	statsLoading: true,
	stats: {
		cysFLR: {
			supply: BigInt(0),
			price: BigInt(0),
			lockPrice: BigInt(0),
			underlyingTvl: BigInt(0),
			usdTvl: BigInt(0)
		},
		cyWETH: {
			supply: BigInt(0),
			price: BigInt(0),
			lockPrice: BigInt(0),
			underlyingTvl: BigInt(0),
			usdTvl: BigInt(0)
		}
	},
	balances: {
		cysFLR: {
			signerBalance: BigInt(0),
			signerUnderlyingBalance: BigInt(0)
		},
		cyWETH: {
			signerBalance: BigInt(0),
			signerUnderlyingBalance: BigInt(0)
		}
	},
	swapQuotes: {
		cyTokenOutput: BigInt(0),
		cusdxOutput: BigInt(0)
	}
};

const getDepositPreviewSwapValue = async (
	config: Config,
	selectedToken: CyToken,
	valueToken: Hex,
	depositAmount: bigint
) => {
	const { result: depositPreviewValue } = await simulateErc20PriceOracleReceiptVaultPreviewDeposit(
		config,
		{
			address: selectedToken.address,
			args: [depositAmount, 0n],
			account: ZeroAddress as `0x${string}`
		}
	);

	let cusdxOutput = BigInt(0);
	if (selectedToken.name === 'cysFLR') {
		const { result: swapQuote } = await simulateQuoterQuoteExactInputSingle(config, {
			address: get(quoterAddress),
			args: [
				{
					tokenIn: selectedToken.address,
					tokenOut: valueToken,
					amountIn: depositPreviewValue,
					fee: 3000,
					sqrtPriceLimitX96: BigInt(0)
				}
			]
		});
		cusdxOutput = swapQuote[0];
	}
	return { cyTokenOutput: depositPreviewValue, cusdxOutput };
};

const getCyTokenUsdPrice = async (
	config: Config,
	quoterAddress: Hex,
	cusdxAddress: Hex,
	selectedToken: CyToken
) => {
	const data = await simulateQuoterQuoteExactOutputSingle(config, {
		address: quoterAddress,
		args: [
			{
				tokenIn: cusdxAddress,
				tokenOut: selectedToken.address,
				amount: BigInt(1e18),
				fee: 3000,
				sqrtPriceLimitX96: BigInt(0)
			}
		]
	});
	return data.result[0] || 0n;
};

const getLockPrice = async (config: Config, selectedToken: CyToken) => {
	const { result } = await simulateErc20PriceOracleReceiptVaultPreviewDeposit(config, {
		address: selectedToken.address,
		args: [BigInt(1e18), 0n],
		account: ZeroAddress as `0x${string}`
	});
	return result;
};

const getcysFLRSupply = async (config: Config, selectedToken: CyToken) => {
	const data = await readErc20TotalSupply(config, {
		address: selectedToken.address
	});
	return data;
};

// Get the TVL
const getUnderlyingBalanceLockedInCysToken = async (
	config: Config,
	selectedToken: CyToken,
	underlyingAddress: Hex
) => {
	const underlyingBalanceLockedInCysToken = await readErc20BalanceOf(config, {
		address: underlyingAddress,
		args: [selectedToken.address]
	});
	return underlyingBalanceLockedInCysToken;
};

const balancesStore = () => {
	const { subscribe, set, update } = writable<StatsState>({
		status: 'Checking',
		statsLoading: true,
		stats: {
			cysFLR: {
				supply: BigInt(0),
				price: BigInt(0),
				lockPrice: BigInt(0),
				underlyingTvl: BigInt(0),
				usdTvl: BigInt(0)
			},
			cyWETH: {
				supply: BigInt(0),
				price: BigInt(0),
				lockPrice: BigInt(0),
				underlyingTvl: BigInt(0),
				usdTvl: BigInt(0)
			}
		},
		balances: {
			cysFLR: {
				signerBalance: BigInt(0),
				signerUnderlyingBalance: BigInt(0)
			},
			cyWETH: {
				signerBalance: BigInt(0),
				signerUnderlyingBalance: BigInt(0)
			}
		},
		swapQuotes: {
			cyTokenOutput: BigInt(0),
			cusdxOutput: BigInt(0)
		}
	});
	const reset = () => set(initialState);

	const refreshPrices = async (config: Config, selectedToken: CyToken) => {
		if (!selectedToken?.address) return;

		const [lockPrice, cysFlrSupply, underlyingBalanceLockedInCysToken] = await Promise.all([
			getLockPrice(config, selectedToken),
			getcysFLRSupply(config, selectedToken),
			getUnderlyingBalanceLockedInCysToken(config, selectedToken, selectedToken.underlyingAddress)
		]);

		update((state) => ({
			...state,
			status: 'Ready',
			stats: {
				...state.stats,
				[selectedToken.name]: {
					...state.stats[selectedToken.name],
					price: state.stats[selectedToken.name].price,
					lockPrice,
					supply: cysFlrSupply,
					underlyingTvl: underlyingBalanceLockedInCysToken,
					usdTvl: (underlyingBalanceLockedInCysToken * lockPrice) / BigInt(1e18)
				}
			}
		}));
	};

	const refreshBalances = async (config: Config, signerAddress: Hex) => {
		try {
			update((state) => ({ ...state, status: 'Checking' }));

			await Promise.all(
				tokens.map(async (token: CyToken) => {
					const [underlyingBalance, balance] = await Promise.all([
						readErc20BalanceOf(config, {
							address: token.underlyingAddress,
							args: [signerAddress]
						}),
						readErc20BalanceOf(config, {
							address: token.address,
							args: [signerAddress]
						})
					]);

					update((state) => ({
						...state,
						balances: {
							...state.balances,
							[token.name]: {
								signerBalance: balance,
								signerUnderlyingBalance: underlyingBalance
							}
						}
					}));
				})
			);

			update((state) => ({ ...state, status: 'Ready' }));
		} catch (error) {
			console.error('Error refreshing balances:', error);
			update((state) => ({ ...state, status: 'Error' }));
		}
	};

	const refreshDepositPreviewSwapValue = async (
		config: Config,
		selectedToken: CyToken,
		valueToken: Hex,
		assets: bigint
	) => {
		const swapQuotes = await getDepositPreviewSwapValue(config, selectedToken, valueToken, assets);
		update((state) => ({
			...state,
			swapQuotes
		}));
	};

	const refreshFooterStats = async (config: Config, quoterAddress: Hex, cusdxAddress: Hex) => {
		const getTokenStats = async (token: CyToken) => {
			const [supplyResult, priceResult, lockPriceResult, tvlResult] = await Promise.all([
				getcysFLRSupply(config, token).catch((error) => {
					console.log(`Failed to fetch supply for ${token.name}:`, error);
					return BigInt(0);
				}),
				getCyTokenUsdPrice(config, quoterAddress, cusdxAddress, token).catch((error) => {
					console.log(`Failed to fetch price for ${token.name}:`, error);
					return BigInt(0);
				}),
				getLockPrice(config, token).catch((error) => {
					console.log(`Failed to fetch lock price for ${token.name}:`, error);
					return BigInt(0);
				}),
				getUnderlyingBalanceLockedInCysToken(config, token, token.underlyingAddress).catch(
					(error) => {
						console.log(`Failed to fetch TVL for ${token.name}:`, error);
						return BigInt(0);
					}
				)
			]);

			const stats = {
				supply: supplyResult,
				price: priceResult,
				lockPrice: lockPriceResult,
				underlyingTvl: tvlResult,
				usdTvl: lockPriceResult > 0n ? (tvlResult * lockPriceResult) / BigInt(1e18) : BigInt(0)
			};

			return stats;
		};

		const [cysFLRStats, cyWETHStats] = await Promise.all(
			tokens.map(async (token) => await getTokenStats(token))
		);

		update((state) => ({
			...state,
			statsLoading: false,
			stats: {
				cysFLR: {
					...state.stats.cysFLR,
					...cysFLRStats
				},
				cyWETH: {
					...state.stats.cyWETH,
					...cyWETHStats
				}
			}
		}));
	};

	return {
		subscribe,
		reset,
		refreshBalances,
		refreshPrices,
		refreshDepositPreviewSwapValue,
		refreshFooterStats
	};
};

export default balancesStore();

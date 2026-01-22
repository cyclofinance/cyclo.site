import { type Config, simulateContract, readContract } from '@wagmi/core';
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
import { zeroAddress } from 'viem';
import { arbitrum } from '@wagmi/core/chains';
import type { CyToken } from './types';
import { supportedNetworks, tokens, quoterAddress, type NetworkConfig } from './stores';
import { ALGEBRA_QUOTER_ABI } from './constants';
import blockNumberStore from './blockNumberStore';
import { I_PYTH_ABI, PYTH_ORACLE_ABI, CYCLO_VAULT_ABI } from './pyth';

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

const getAllTokensAcrossNetworks = () => supportedNetworks.flatMap((network) => network.tokens);

// Helper function to create initial state from tokens
const createInitialState = (tokens: CyToken[]): StatsState => {
	const stats: StatsState['stats'] = {};
	const balances: StatsState['balances'] = {};

	for (const token of tokens) {
		stats[token.name] = {
			supply: BigInt(0),
			price: BigInt(0),
			lockPrice: BigInt(0),
			underlyingTvl: BigInt(0),
			usdTvl: BigInt(0)
		};
		balances[token.name] = {
			signerBalance: BigInt(0),
			signerUnderlyingBalance: BigInt(0)
		};
	}

	return {
		status: 'Checking',
		statsLoading: true,
		stats,
		balances,
		swapQuotes: {
			cyTokenOutput: BigInt(0),
			cusdxOutput: BigInt(0)
		}
	};
};

const getDepositPreviewSwapValue = async (
	config: Config,
	selectedToken: CyToken,
	valueToken: Hex,
	depositAmount: bigint,
	blockNumber: bigint
) => {
	try {
		const { result: depositPreviewValue } =
			await simulateErc20PriceOracleReceiptVaultPreviewDeposit(config, {
				address: selectedToken.address,
				args: [depositAmount, 0n],
				account: ZeroAddress as `0x${string}`,
				blockNumber: blockNumber,
				chainId: selectedToken.chainId
			});

		// Use Algebra quoter for Arbitrum, standard quoter for Flare
		if (selectedToken.chainId === arbitrum.id) {
			try {
				const sim = await simulateContract(config, {
					address: get(quoterAddress),
					abi: ALGEBRA_QUOTER_ABI,
					functionName: 'quoteExactInputSingle',
					args: [selectedToken.address, valueToken, depositPreviewValue, 0n],
					account: zeroAddress,
					chainId: selectedToken.chainId
				});

				// Algebra quoter returns [amountOut, fee]
				return { cyTokenOutput: depositPreviewValue, cusdxOutput: sim.result[0] ?? 0n };
			} catch (error) {
				console.error('Error getting swapQuote with Algebra quoter:', error);
				return { cyTokenOutput: depositPreviewValue, cusdxOutput: 0n };
			}
		}

		// Flare network - use existing implementation
		try {
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
				],
				chainId: selectedToken.chainId
			});
			return { cyTokenOutput: depositPreviewValue, cusdxOutput: swapQuote[0] };
		} catch {
			// Try with fee 10000 if fee 3000 fails
			try {
				const { result: swapQuote } = await simulateQuoterQuoteExactInputSingle(config, {
					address: get(quoterAddress),
					args: [
						{
							tokenIn: selectedToken.address,
							tokenOut: valueToken,
							amountIn: depositPreviewValue,
							fee: 10000,
							sqrtPriceLimitX96: BigInt(0)
						}
					],
					chainId: selectedToken.chainId
				});
				return { cyTokenOutput: depositPreviewValue, cusdxOutput: swapQuote[0] };
			} catch (error) {
				console.error('Error getting swapQuote with both fee pools:', error);
				return { cyTokenOutput: depositPreviewValue, cusdxOutput: 0n };
			}
		}
	} catch (error) {
		console.error('Error getting deposit preview:', error);
		return { cyTokenOutput: 0n, cusdxOutput: 0n };
	}
};

const getCyTokenUsdPrice = async (
	config: Config,
	quoterAddress: Hex,
	cusdxAddress: Hex,
	selectedToken: CyToken,
	chainId?: number
) => {
	// Use Algebra quoter for Arbitrum, standard quoter for Flare
	if (chainId === arbitrum.id) {
		try {
			const amountOut = BigInt(10 ** selectedToken.decimals); // 1 tokenOut
			const sim = await simulateContract(config, {
				address: quoterAddress,
				abi: ALGEBRA_QUOTER_ABI,
				functionName: 'quoteExactOutputSingle',
				args: [cusdxAddress, selectedToken.address, amountOut, 0n],
				account: zeroAddress,
				chainId
			});

			// Algebra quoter returns [amountIn, fee]
			return sim.result[0] ?? 0n;
		} catch (error) {
			console.error('Error getting cyTokenUsdPrice with Algebra quoter:', error);
			return 0n;
		}
	}

	// Flare network - use existing implementation
	try {
		const data = await simulateQuoterQuoteExactOutputSingle(config, {
			address: quoterAddress,
			args: [
				{
					tokenIn: cusdxAddress,
					tokenOut: selectedToken.address,
					amount: BigInt(10 ** selectedToken.decimals),
					fee: 3000,
					sqrtPriceLimitX96: BigInt(0)
				}
			],
			account: ZeroAddress as `0x${string}`,
			chainId
		});
		return data.result[0] || 0n;
	} catch {
		try {
			// try 10000 as the fee
			const data = await simulateQuoterQuoteExactOutputSingle(config, {
				address: quoterAddress,
				args: [
					{
						tokenIn: cusdxAddress,
						tokenOut: selectedToken.address,
						amount: BigInt(10 ** selectedToken.decimals),
						fee: 10000,
						sqrtPriceLimitX96: BigInt(0)
					}
				],
				account: ZeroAddress as `0x${string}`,
				chainId
			});
			return data.result[0] || 0n;
		} catch (error) {
			console.error('Error getting cyTokenUsdPrice:', error);
			return 0n;
		}
	}
};

const getLockPrice = async (config: Config, selectedToken: CyToken, chainId?: number) => {
	const { result } = await simulateErc20PriceOracleReceiptVaultPreviewDeposit(config, {
		address: selectedToken.address,
		args: [BigInt(1e18), 0n],
		account: ZeroAddress as `0x${string}`,
		chainId
	});
	return result;
};

const getLockPriceFooterStats = async (
	config: Config,
	selectedToken: CyToken,
	chainId?: number
) => {
	const effectiveChainId = chainId ?? selectedToken.chainId;

	// For Arbitrum, use Pyth getPriceNoOlderThan directly
	if (effectiveChainId === arbitrum.id) {
		try {
			// Fetch priceOracleAddress from vault
			const priceOracleAddress = (await readContract(config, {
				abi: CYCLO_VAULT_ABI,
				address: selectedToken.address as Hex,
				functionName: 'priceOracle',
				args: [],
				chainId: effectiveChainId
			})) as Hex;

			// Fetch pythContractAddress from priceOracle
			const pythContractAddress = (await readContract(config, {
				abi: PYTH_ORACLE_ABI,
				address: priceOracleAddress as Hex,
				functionName: 'I_PYTH_CONTRACT',
				args: [],
				chainId: effectiveChainId
			})) as Hex;

			// Fetch feedId from priceOracle
			const iPythFeedId = (await readContract(config, {
				abi: PYTH_ORACLE_ABI,
				address: priceOracleAddress as Hex,
				functionName: 'I_PRICE_FEED_ID',
				args: [],
				chainId: effectiveChainId
			})) as Hex;

			// Call getPriceNoOlderThan with 60 seconds max age
			const priceData = (await readContract(config, {
				abi: I_PYTH_ABI,
				address: pythContractAddress as Hex,
				functionName: 'getPriceNoOlderThan',
				args: [iPythFeedId, 7776000n],
				chainId: effectiveChainId
			})) as { price: bigint; conf: bigint; expo: bigint; publishTime: bigint };

			// Convert Pyth price to 18 decimal format
			// Following PythUtils.parsePriceFeedToNormalizedPrice logic:
			// deltaExponent = targetDecimals (18) + expo
			// If deltaExponent > 0: price * 10^deltaExponent
			// If deltaExponent < 0: price / 10^abs(deltaExponent)
			const pythPrice = priceData.price;
			const pythExpo = Number(priceData.expo);
			const targetDecimals = 18;
			const deltaExponent = targetDecimals + pythExpo;

			// Ensure price is positive (lock price should be positive)
			const unsignedPrice = pythPrice < 0n ? -pythPrice : pythPrice;

			let normalizedPrice: bigint;
			if (deltaExponent > 0) {
				normalizedPrice = unsignedPrice * BigInt(10 ** deltaExponent);
			} else if (deltaExponent < 0) {
				normalizedPrice = unsignedPrice / BigInt(10 ** Math.abs(deltaExponent));
			} else {
				normalizedPrice = unsignedPrice;
			}

			return normalizedPrice;
		} catch (error) {
			console.error('Error getting lock price from Pyth for Arbitrum:', error);
			// Fallback to normal method on error
			const { result } = await simulateErc20PriceOracleReceiptVaultPreviewDeposit(config, {
				address: selectedToken.address,
				args: [BigInt(1e18), 0n],
				account: ZeroAddress as `0x${string}`,
				chainId: effectiveChainId
			});
			return result;
		}
	}

	// For non-Arbitrum chains, use normal method
	const { result } = await simulateErc20PriceOracleReceiptVaultPreviewDeposit(config, {
		address: selectedToken.address,
		args: [BigInt(1e18), 0n],
		account: ZeroAddress as `0x${string}`,
		chainId: effectiveChainId
	});
	return result;
};

const getcysFLRSupply = async (config: Config, selectedToken: CyToken, chainId?: number) => {
	const data = await readErc20TotalSupply(config, {
		address: selectedToken.address,
		chainId
	});
	return data;
};

// Get the TVL
const getUnderlyingBalanceLockedInCysToken = async (
	config: Config,
	selectedToken: CyToken,
	underlyingAddress: Hex,
	currentBlock?: bigint,
	chainId?: number
) => {
	const request: Record<string, unknown> = {
		address: underlyingAddress,
		args: [selectedToken.address]
	};

	if (typeof currentBlock !== 'undefined') {
		request.blockNumber = currentBlock;
	}

	if (typeof chainId !== 'undefined') {
		request.chainId = chainId;
	}

	const underlyingBalanceLockedInCysToken = await readErc20BalanceOf(
		config,
		request as Parameters<typeof readErc20BalanceOf>[1]
	);
	return underlyingBalanceLockedInCysToken;
};

const balancesStore = () => {
	// Initialize with current tokens
	const initialTokens = getAllTokensAcrossNetworks();
	const initialState = createInitialState(initialTokens);

	const { subscribe, set, update } = writable<StatsState>(initialState);

	const reset = () => {
		set(createInitialState(getAllTokensAcrossNetworks()));
	};

	const refreshPrices = async (config: Config, selectedToken: CyToken) => {
		if (!selectedToken?.address) return;
		const { blockNumber } = get(blockNumberStore);

		const [lockPrice, cysFlrSupply, underlyingBalanceLockedInCysToken] = await Promise.all([
			getLockPrice(config, selectedToken).catch((error) => {
				console.log(`Failed to fetch lock price for ${selectedToken.name}:`, error);
				return BigInt(0);
			}),
			getcysFLRSupply(config, selectedToken).catch((error) => {
				console.log(`Failed to fetch supply for ${selectedToken.name}:`, error);
				return BigInt(0);
			}),
			getUnderlyingBalanceLockedInCysToken(
				config,
				selectedToken,
				selectedToken.underlyingAddress,
				blockNumber
			).catch((error) => {
				console.log(`Failed to fetch TVL for ${selectedToken.name}:`, error);
				return BigInt(0);
			})
		]);

		update((state) => {
			// Ensure token exists in state, initialize if missing
			if (!state.stats[selectedToken.name]) {
				state.stats[selectedToken.name] = {
					supply: BigInt(0),
					price: BigInt(0),
					lockPrice: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				};
			}
			if (!state.balances[selectedToken.name]) {
				state.balances[selectedToken.name] = {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				};
			}

			return {
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
						usdTvl:
							lockPrice > 0n
								? (underlyingBalanceLockedInCysToken * lockPrice) / BigInt(1e18)
								: BigInt(0)
					}
				}
			};
		});
	};

	const refreshBalances = async (config: Config, signerAddress: Hex) => {
		try {
			update((state) => ({ ...state, status: 'Checking' }));

			const currentTokens: CyToken[] = get(tokens);
			await Promise.all(
				currentTokens.map(async (token: CyToken) => {
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
		const { blockNumber } = get(blockNumberStore);
		const swapQuotes = await getDepositPreviewSwapValue(
			config,
			selectedToken,
			valueToken,
			assets,
			blockNumber
		);
		update((state) => ({
			...state,
			swapQuotes
		}));
	};

	const refreshFooterStats = async (config: Config) => {
		const getTokenStats = async (token: CyToken, network: NetworkConfig) => {
			const [supplyResult, priceResult, lockPriceResult, tvlResult] = await Promise.all([
				getcysFLRSupply(config, token, token.chainId).catch((error) => {
					console.log(`Failed to fetch supply for ${token.name}:`, error);
					return BigInt(0);
				}),
				getCyTokenUsdPrice(
					config,
					network.quoterAddress,
					network.usdcAddress,
					token,
					token.chainId
				).catch((error) => {
					console.log(`Failed to fetch price for ${token.name}:`, error);
					return BigInt(0);
				}),
				getLockPriceFooterStats(config, token, token.chainId).catch((error) => {
					console.log(`Failed to fetch lock price for ${token.name}:`, error);
					return BigInt(0);
				}),
				getUnderlyingBalanceLockedInCysToken(
					config,
					token,
					token.underlyingAddress,
					undefined,
					token.chainId
				).catch((error) => {
					console.log(`Failed to fetch TVL for ${token.name}:`, error);
					return BigInt(0);
				})
			]);

			const stats = {
				supply: supplyResult,
				price: priceResult,
				lockPrice: lockPriceResult,
				underlyingTvl: tvlResult,
				usdTvl: lockPriceResult > 0n ? (tvlResult * lockPriceResult) / BigInt(1e18) : BigInt(0)
			};

			return { tokenName: token.name, stats };
		};

		const tokenStatsResults = await Promise.all(
			supportedNetworks.flatMap((network) =>
				network.tokens.map((token: CyToken) => getTokenStats(token, network))
			)
		);

		update((state) => {
			const updatedStats = { ...state.stats };

			// Update stats for all tokens
			for (const { tokenName, stats } of tokenStatsResults) {
				// Ensure token exists in state, initialize if missing
				if (!updatedStats[tokenName]) {
					updatedStats[tokenName] = {
						supply: BigInt(0),
						price: BigInt(0),
						lockPrice: BigInt(0),
						underlyingTvl: BigInt(0),
						usdTvl: BigInt(0)
					};
				}
				updatedStats[tokenName] = {
					...updatedStats[tokenName],
					...stats
				};
			}

			return {
				...state,
				statsLoading: false,
				stats: updatedStats
			};
		});
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

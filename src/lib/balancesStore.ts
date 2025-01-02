import { type Config } from '@wagmi/core';
import {
	readErc20BalanceOf,
	readErc20TotalSupply,
	simulateErc20PriceOracleReceiptVaultPreviewDeposit,
	simulateQuoterQuoteExactInputSingle,
	simulateQuoterQuoteExactOutputSingle
} from '../generated';
import { writable } from 'svelte/store';
import type { Hex } from 'viem';
import { ZeroAddress } from 'ethers';
import blockNumberStore from './blockNumberStore';
import { get } from 'svelte/store';

const initialState = {
	cysFlrBalance: BigInt(0),
	sFlrBalance: BigInt(0),
	status: 'Checking',
	lockPrice: BigInt(0),
	cysFlrUsdPrice: BigInt(0),
	cysFlrSupply: BigInt(0),
	TVLsFlr: BigInt(0),
	TVLUsd: BigInt(0),
	swapQuotes: {
		cysFlrOutput: BigInt(0),
		cusdxOutput: BigInt(0)
	}
};

const getSwapQuote = async (
	config: Config,
	cysFlrAddress: Hex,
	cusdxAddress: Hex,
	assets: bigint,
	quoterAddress: Hex,
	blockNumber: bigint
) => {
	try {
		const { result: depositPreviewValue } =
			await simulateErc20PriceOracleReceiptVaultPreviewDeposit(config, {
				address: cysFlrAddress,
				args: [assets, 0n],
				account: ZeroAddress as `0x${string}`,
				blockNumber: blockNumber
			});
		const { result: swapQuote } = await simulateQuoterQuoteExactInputSingle(config, {
			address: quoterAddress,
			blockNumber: blockNumber,
			args: [
				{
					tokenIn: cysFlrAddress,
					tokenOut: cusdxAddress,
					amountIn: depositPreviewValue,
					fee: 3000,
					sqrtPriceLimitX96: BigInt(0)
				}
			]
		});
		return { cysFlrOutput: depositPreviewValue, cusdxOutput: swapQuote[0] };
	} catch (error) {
		console.error('Error getting swapQuote:', error);
		return { cysFlrOutput: 0n, cusdxOutput: 0n };
	}
};

const getcysFLRUsdPrice = async (
	config: Config,
	quoterAddress: Hex,
	cusdxAddress: Hex,
	cysFlrAddress: Hex,
	blockNumber: bigint
) => {
	try {
		const data = await simulateQuoterQuoteExactOutputSingle(config, {
			address: quoterAddress,
			blockNumber: blockNumber,
			args: [
				{
					tokenIn: cusdxAddress,
					tokenOut: cysFlrAddress,
					amount: BigInt(1e18),
					fee: 3000,
					sqrtPriceLimitX96: BigInt(0)
				}
			]
		});
		return data.result[0] || 0n;
	} catch (error) {
		console.error('Error getting cysFLRUsdPrice:', error);
		return 0n;
	}
};

const getLockPrice = async (config: Config, cysFlrAddress: Hex, blockNumber: bigint) => {
	try {
		const { result } = await simulateErc20PriceOracleReceiptVaultPreviewDeposit(config, {
			address: cysFlrAddress,
			args: [BigInt(1e18), 0n],
			account: ZeroAddress as `0x${string}`,
			blockNumber: blockNumber
		});
		return result;
	} catch (error) {
		console.error('Error getting lockPrice:', error);
		return 0n;
	}
};

const getcysFLRSupply = async (config: Config, cysFlrAddress: Hex, blockNumber: bigint) => {
	try {
		const data = await readErc20TotalSupply(config, {
			address: cysFlrAddress,
			blockNumber: blockNumber
		});
		return data;
	} catch (error) {
		console.error('Error getting cysFLRSupply:', error);
		return 0n;
	}
};

// Get the TVL

const getsFLRBalanceLockedInCysFlr = async (
	config: Config,
	cysFlrAddress: Hex,
	sFlrAddress: Hex,
	currentBlock: bigint
) => {
	try {
		const sFlrBalanceLockedInCysFlr = await readErc20BalanceOf(config, {
			address: sFlrAddress,
			args: [cysFlrAddress],
			blockNumber: currentBlock
		});
		return sFlrBalanceLockedInCysFlr;
	} catch (error) {
		console.error('Error getting sFlrBalanceLockedInCysFlr:', error);
		return 0n;
	}
};

const balancesStore = () => {
	const { subscribe, set, update } = writable(initialState);
	const reset = () => set(initialState);

	const refreshPrices = async (
		config: Config,
		cysFlrAddress: Hex,
		quoterAddress: Hex,
		cusdxAddress: Hex,
		sFlrAddress: Hex
	) => {
		const { blockNumber } = get(blockNumberStore);

		const [cysFlrUsdPrice, lockPrice, cysFlrSupply, sFlrBalanceLockedInCysFlr] = await Promise.all([
			getcysFLRUsdPrice(config, quoterAddress, cusdxAddress, cysFlrAddress, blockNumber),
			getLockPrice(config, cysFlrAddress, blockNumber),
			getcysFLRSupply(config, cysFlrAddress, blockNumber),
			getsFLRBalanceLockedInCysFlr(config, cysFlrAddress, sFlrAddress, blockNumber)
		]);
		const TVLUsd = (sFlrBalanceLockedInCysFlr * lockPrice) / BigInt(1e18);
		const TVLsFlr = sFlrBalanceLockedInCysFlr;

		update((state) => ({
			...state,
			status: 'Ready',
			cysFlrUsdPrice,
			lockPrice,
			cysFlrSupply,
			TVLsFlr,
			TVLUsd
		}));
	};

	const refreshBalances = async (
		config: Config,
		sFlrAddress: Hex,
		cysFlrAddress: Hex,
		signerAddress: string
	) => {
		const { blockNumber } = get(blockNumberStore);

		try {
			const [newSFlrBalance, newCysFlrBalance] = await Promise.all([
				readErc20BalanceOf(config, {
					address: sFlrAddress,
					args: [signerAddress as Hex],
					blockNumber
				}),
				readErc20BalanceOf(config, {
					address: cysFlrAddress,
					args: [signerAddress as Hex],
					blockNumber
				})
			]);

			update((state) => ({
				...state,
				sFlrBalance: newSFlrBalance,
				cysFlrBalance: newCysFlrBalance,
				status: 'Ready'
			}));
		} catch (error) {
			console.error('Error refreshing balances:', error);
			update((state) => ({
				...state,
				status: 'Error'
			}));
		}
	};

	const refreshSwapQuote = async (
		config: Config,
		cysFlrAddress: Hex,
		cusdxAddress: Hex,
		assets: bigint,
		quoterAddress: Hex
	) => {
		const { blockNumber } = get(blockNumberStore);
		const swapQuotes = await getSwapQuote(
			config,
			cysFlrAddress,
			cusdxAddress,
			assets,
			quoterAddress,
			blockNumber
		);
		update((state) => ({
			...state,
			swapQuotes
		}));
	};

	return {
		subscribe,
		reset,
		refreshBalances,
		refreshPrices,
		refreshSwapQuote
	};
};

export default balancesStore();

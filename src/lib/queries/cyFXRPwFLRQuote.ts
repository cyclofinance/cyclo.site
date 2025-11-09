import {
	cusdxAddress,
	quoterAddress,
	usdcAddress,
	wrappedNativeAddress,
	tokens
} from '$lib/stores';
import { createConfig, http, simulateContract } from '@wagmi/core';
import { get } from 'svelte/store';
import { quoterAbi } from '../../generated';
import { flare } from '@wagmi/core/chains';
import { createClient } from 'viem';

export const getcyFXRPwFLRPrice = async () => {
	const config = createConfig({
		chains: [flare],
		client({ chain }) {
			return createClient({ chain, transport: http() });
		}
	});

	// First get the USDC per cyFXRP price (cyFXRP has 6 decimals)
	const tokenList = get(tokens);
	const cyFXRPTokens = tokenList.filter((token) => token.name === 'cyFXRP');

	if (!cyFXRPTokens.length) {
		throw new Error('cyFXRP token configuration is missing for the active network.');
	}

	const cyFXRPUSDCPrice = (
		await simulateContract(config, {
			address: get(quoterAddress),
			abi: quoterAbi,
			functionName: 'quoteExactInputSingle',
			args: [
				{
					tokenIn: cyFXRPTokens[0].address,
					tokenOut: get(cusdxAddress),
					amountIn: BigInt(1e6), // cyFXRP has 6 decimals
					fee: 10000,
					sqrtPriceLimitX96: BigInt(0)
				}
			],
			account: '0x0000000000000000000000000000000000000000'
		})
	).result[0];

	// Then get the USDC per wFLR price
	const wFLRUSDCPrice = (
		await simulateContract(config, {
			address: get(quoterAddress),
			abi: quoterAbi,
			functionName: 'quoteExactInputSingle',
			args: [
				{
					tokenIn: get(wrappedNativeAddress),
					tokenOut: get(usdcAddress),
					amountIn: BigInt(1e18),
					fee: 3000,
					sqrtPriceLimitX96: BigInt(0)
				}
			],
			account: '0x0000000000000000000000000000000000000000'
		})
	).result[0];

	// Calculate wFLR per cyFXRP price
	// cyFXRPUSDCPrice is for 1e6 cyFXRP (6 decimals), we need to normalize to 18 decimals
	// So multiply by 10^12 to convert from 6 decimals to 18 decimals
	const wFLRcyFXRPPrice = (cyFXRPUSDCPrice * 10n ** 12n) / wFLRUSDCPrice;
	return wFLRcyFXRPPrice;
};

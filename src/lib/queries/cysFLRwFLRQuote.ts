import {
	cusdxAddress,
	quoterAddress,
	usdcAddress,
	wFLRAddress,
	tokens,
	selectedNetwork
} from '$lib/stores';
import { createConfig, http, simulateContract } from '@wagmi/core';
import { get } from 'svelte/store';
import { quoterAbi } from '../../generated';
import { createClient } from 'viem';

export const getcysFLRwFLRPrice = async () => {
	const network = get(selectedNetwork);
	const currentTokens = get(tokens);
	const cysFLRToken = currentTokens.find((t) => t.symbol === 'cysFLR');

	if (!cysFLRToken) {
		throw new Error('cysFLR token not found in current network');
	}

	const config = createConfig({
		chains: [network.chain],
		client({ chain }) {
			return createClient({ chain, transport: http() });
		}
	});
	// first get the cUSDX per cysFLR price
	const cysFLRcUSDXPrice = (
		await simulateContract(config, {
			address: get(quoterAddress),
			abi: quoterAbi,
			functionName: 'quoteExactInputSingle',
			args: [
				{
					tokenIn: cysFLRToken.address,
					tokenOut: get(cusdxAddress),
					amountIn: BigInt(1e18),
					fee: 3000,
					sqrtPriceLimitX96: BigInt(0)
				}
			],
			account: '0x0000000000000000000000000000000000000000'
		})
	).result[0];

	// then get the usdc per wFLR price
	const wFLRcUSDCPrice = (
		await simulateContract(config, {
			address: get(quoterAddress),
			abi: quoterAbi,
			functionName: 'quoteExactInputSingle',
			args: [
				{
					tokenIn: get(wFLRAddress),
					tokenOut: get(usdcAddress),
					amountIn: BigInt(1e18),
					fee: 3000,
					sqrtPriceLimitX96: BigInt(0)
				}
			],
			account: '0x0000000000000000000000000000000000000000'
		})
	).result[0];

	// finally calculate the wFLR per cysFLR price
	const wFLRcysFLRPrice = (cysFLRcUSDXPrice * 10n ** 18n) / wFLRcUSDCPrice;
	return wFLRcysFLRPrice;
};

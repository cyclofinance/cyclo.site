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

export const getcyWETHwFLRPrice = async () => {
	const network = get(selectedNetwork);
	const currentTokens = get(tokens);
	const cyWETHToken = currentTokens.find((t) => t.symbol === 'cyWETH');

	if (!cyWETHToken) {
		throw new Error('cyWETH token not found in current network');
	}

	const config = createConfig({
		chains: [network.chain],
		client({ chain }) {
			return createClient({ chain, transport: http() });
		}
	});

	// First get the USDC per cyWETH price
	const cyWETHUSDCPrice = (
		await simulateContract(config, {
			address: get(quoterAddress),
			abi: quoterAbi,
			functionName: 'quoteExactInputSingle',
			args: [
				{
					tokenIn: cyWETHToken.address,
					tokenOut: get(cusdxAddress),
					amountIn: BigInt(1e18),
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

	// Calculate wFLR per cyWETH price
	const wFLRcyWETHPrice = (cyWETHUSDCPrice * 10n ** 18n) / wFLRUSDCPrice;
	return wFLRcyWETHPrice;
};

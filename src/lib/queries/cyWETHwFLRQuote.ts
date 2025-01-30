import { cusdxAddress, quoterAddress, usdcAddress, wFLRAddress, tokens } from '$lib/stores';
import { createConfig, http, simulateContract } from '@wagmi/core';
import { get } from 'svelte/store';
import { quoterAbi } from '../../generated';
import { flare } from '@wagmi/core/chains';
import { createClient } from 'viem';

export const getcyWETHwFLRPrice = async () => {
	const config = createConfig({
		chains: [flare],
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
					tokenIn: tokens[1].address,
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

import { cusdxAddress, quoterAddress, usdcAddress, wFLRAddress, tokens } from '$lib/stores';
import { createConfig, http, simulateContract } from '@wagmi/core';
import { get } from 'svelte/store';
import { quoterAbi } from '../../generated';
import { flare } from '@wagmi/core/chains';
import { createClient } from 'viem';

export const getcysFLRwFLRPrice = async () => {
	const config = createConfig({
		chains: [flare],
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
					tokenIn: tokens[0].address,
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

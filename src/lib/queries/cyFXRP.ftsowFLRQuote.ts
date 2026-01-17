import { quoterAddress, usdcAddress, wFLRAddress, tokens, selectedNetwork } from '$lib/stores';
import { createConfig, http, simulateContract } from '@wagmi/core';
import { get } from 'svelte/store';
import { quoterAbi } from '../../generated';
import { createClient } from 'viem';

export const getcyFXRPftsoWFLRPrice = async () => {
	const network = get(selectedNetwork);
	const currentTokens = get(tokens);
	const cyFXRPftsoToken = currentTokens.find((t) => t.symbol === 'cyFXRP.ftso');

	if (!cyFXRPftsoToken) {
		throw new Error('cyFXRP.ftso token not found in current network');
	}

	const config = createConfig({
		chains: [network.chain],
		client({ chain }) {
			return createClient({ chain, transport: http() });
		}
	});
	// first get the cUSDX per cyFXRP.ftso price
	const cyFXRPftsoCUSDXPrice = (
		await simulateContract(config, {
			address: get(quoterAddress),
			abi: quoterAbi,
			functionName: 'quoteExactInputSingle',
			args: [
				{
					tokenIn: cyFXRPftsoToken.address,
					tokenOut: get(usdcAddress),
					amountIn: BigInt(1e6),
					fee: 10000,
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

	// finally calculate the wFLR per cyFXRP.ftso price
	// Note: cyFXRP.ftso has 6 decimals (we used 1e6 input), wFLR has 18 decimals (we used 1e18 input)
	// We need to normalize: multiply by 1e12 to account for decimal difference (18-6=12)
	// Then multiply by 1e18 as per the standard pattern used in other quote functions
	const wFLRcyFXRPftsoPrice = (cyFXRPftsoCUSDXPrice * 10n ** 12n * 10n ** 18n) / wFLRcUSDCPrice;
	return wFLRcyFXRPftsoPrice;
};

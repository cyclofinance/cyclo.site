import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { createConfig, http, simulateContract } from '@wagmi/core';
import { get } from 'svelte/store';
import { quoterAddress, cysFlrAddress, cusdxAddress, usdcAddress, wFLRAddress } from '$lib/stores';
import { quoterAbi } from '../../generated';
import { flare } from '@wagmi/core/chains';
import { createClient } from 'viem';

describe('getcysFLRwFLRPrice', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and calculates wFLR per cysFLR price correctly', async () => {
		const config = createConfig({
			chains: [flare],
			client({ chain }) {
				return createClient({ chain, transport: http() });
			}
		});

		const wFLRcUSDCPriceMock = (
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

		const cysFLRcUSDXPriceMock = (
			await simulateContract(config, {
				address: get(quoterAddress),
				abi: quoterAbi,
				functionName: 'quoteExactInputSingle',
				args: [
					{
						tokenIn: get(cysFlrAddress),
						tokenOut: get(cusdxAddress),
						amountIn: BigInt(1e18),
						fee: 3000,
						sqrtPriceLimitX96: BigInt(0)
					}
				],
				account: '0x0000000000000000000000000000000000000000'
			})
		).result[0];

		const result = await getcysFLRwFLRPrice();

		const expectedPrice = (cysFLRcUSDXPriceMock * 10n ** 18n) / wFLRcUSDCPriceMock;
		expect(result).toEqual(expectedPrice);
	});
});

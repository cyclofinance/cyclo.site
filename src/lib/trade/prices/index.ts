import { formatUnits, zeroAddress } from 'viem';
import { flare, arbitrum } from '@wagmi/core/chains';
import { getPublicClient, type Config } from '@wagmi/core';
import { DataFetcher, Router } from 'sushi/router';
import { Token } from 'sushi/currency';
import type { Token as _Token } from '$lib/types';
import type { MultiRoute } from 'sushi/tines';
import type { Chain } from '@wagmi/core/chains';
import { supportedNetworks, selectedNetwork, type NetworkConfig } from '$lib/stores';
import { ALGEBRA_QUOTER_ABI } from '$lib/constants';
import { get } from 'svelte/store';
import { wagmiConfig } from 'svelte-wagmi';

// Cache for DataFetchers per chainId
const dataFetcherCache = new Map<number, DataFetcher>();

// Map to store chainId for each DataFetcher instance
const dataFetcherChainIdMap = new WeakMap<DataFetcher, number>();

// Chain objects by ID
const CHAINS_BY_ID: Record<number, Chain> = {
	[flare.id]: flare,
	[arbitrum.id]: arbitrum
};

export const getAndStartDataFetcher = (chainId: number = flare.id, config?: Config) => {
	// Return cached DataFetcher if available
	if (dataFetcherCache.has(chainId)) {
		return dataFetcherCache.get(chainId)!;
	}

	const chain = CHAINS_BY_ID[chainId];
	if (!chain) {
		throw new Error(`Unsupported chainId: ${chainId}`);
	}

	// Use wagmi config to get public client (uses wallet's RPC)
	const wagmiConfigValue = config ?? get(wagmiConfig);
	if (!wagmiConfigValue) {
		throw new Error('Wagmi config not available');
	}

	const client = getPublicClient(wagmiConfigValue, { chainId });
	if (!client) {
		throw new Error(`Failed to get public client for chainId: ${chainId}`);
	}

	const dataFetcher = new DataFetcher(chainId as any, client);
	dataFetcher.startDataFetching();
	dataFetcher.stopDataFetching();

	// Store chainId for this DataFetcher instance
	dataFetcherChainIdMap.set(dataFetcher, chainId);

	// Cache the DataFetcher
	dataFetcherCache.set(chainId, dataFetcher);
	return dataFetcher;
};

export const getRoute = async (
	inputToken: Token,
	outputToken: Token,
	amountIn: bigint,
	dataFetcher: DataFetcher
): Promise<MultiRoute> => {
	// Get chainId from the WeakMap, fallback to Flare for backward compatibility
	const chainId = dataFetcherChainIdMap.get(dataFetcher) ?? flare.id;

	// dataFecther's web3Client is the viem client that has been used to instantiate DataFetcher
	const gasPrice = await dataFetcher.web3Client.getGasPrice();

	await dataFetcher.fetchPoolsForToken(inputToken, outputToken);
	const pcMap = dataFetcher.getCurrentPoolCodeMap(inputToken, outputToken);
	const route = Router.findBestRoute(
		pcMap,
		chainId as any,
		inputToken,
		amountIn,
		outputToken,
		Number(gasPrice),
		undefined,
		undefined,
		undefined,
		'single'
	);

	return route;
};

export const getPrice = async (
	inputToken: _Token,
	outputToken: _Token,
	dataFetcher: DataFetcher
) => {
	try {
		// Determine chainId from tokens if they're CyTokens (have chainId), otherwise use selectedNetwork or DataFetcher's chainId
		// Check both tokens since either could be a CyToken
		const outputTokenChainId = (outputToken as any).chainId;
		const inputTokenChainId = (inputToken as any).chainId;
		const tokenChainId = outputTokenChainId ?? inputTokenChainId;
		const selectedNetworkChainId = get(selectedNetwork)?.chain.id;
		const dataFetcherChainId = dataFetcherChainIdMap.get(dataFetcher);
		const chainId = tokenChainId ?? selectedNetworkChainId ?? dataFetcherChainId ?? flare.id;

		// Use Algebra quoter for Arbitrum (Camelot pools not supported by sushi router)
		if (chainId === arbitrum.id) {
			console.log('Arbitrum network detected, chainId:', chainId);
			const network = supportedNetworks.find((n: NetworkConfig) => n.chain.id === arbitrum.id);
			if (!network) {
				throw new Error('Arbitrum network configuration not found');
			}

			const amountIn = BigInt(10 ** inputToken.decimals); // 1 input token
			
			// Use wagmi config to get public client (uses wallet's RPC)
			const wagmiConfigValue = get(wagmiConfig);
			if (!wagmiConfigValue) {
				throw new Error('Wagmi config not available');
			}

			const client = getPublicClient(wagmiConfigValue, { chainId: arbitrum.id });
			if (!client) {
				throw new Error('Failed to get public client for Arbitrum');
			}
			
			try {
				const sim = await client.simulateContract({
					address: network.quoterAddress,
					abi: ALGEBRA_QUOTER_ABI,
					functionName: 'quoteExactInputSingle',
					args: [inputToken.address, outputToken.address, amountIn, 0n],
					account: zeroAddress
				});

				// Algebra quoter returns [amountOut, fee]
				const amountOut = sim.result[0] ?? 0n;
				const price = formatUnits(amountOut, outputToken.decimals);
				console.log('Arbitrum price result:', price);
				return price;
			} catch (error) {
				console.error('Error getting price with Algebra quoter:', error);
				return '0';
			}
		}

		// Flare network - use sushi router
		const route = await getRoute(
			new Token({
				chainId,
				address: inputToken.address,
				decimals: inputToken.decimals
			}),
			new Token({ chainId, address: outputToken.address, decimals: outputToken.decimals }),
			10n ** BigInt(inputToken.decimals), // 1 input token
			dataFetcher
		);
		const price = formatUnits(route.amountOutBI, outputToken.decimals);
		return price;
	} catch (error) {
		console.error('Error getting price:', error);
		return '0';
	}
};

import { createPublicClient, formatUnits, http } from 'viem';
import { flare } from '@wagmi/core/chains';
import { DataFetcher, Router } from 'sushi/router';
import { Token } from 'sushi/currency';
import type { Token as _Token } from '$lib/types';
import type { MultiRoute } from 'sushi/tines';

export const getAndStartDataFetcher = () => {
	const client = createPublicClient({
		chain: flare,
		transport: http('https://flare-api.flare.network/ext/C/rpc')
	});
	const dataFetcher = new DataFetcher(flare.id, client);
	dataFetcher.startDataFetching();
	dataFetcher.stopDataFetching();
	return dataFetcher;
};

export const getRoute = async (
	inputToken: Token,
	outputToken: Token,
	amountIn: bigint,
	dataFetcher: DataFetcher
): Promise<MultiRoute> => {
	// dataFecther's web3Client is the viem client that has been used to instantiate DataFetcher
	const gasPrice = await dataFetcher.web3Client.getGasPrice();

	await dataFetcher.fetchPoolsForToken(inputToken, outputToken);
	const pcMap = dataFetcher.getCurrentPoolCodeMap(inputToken, outputToken);
	const route = Router.findBestRoute(
		pcMap,
		flare.id,
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
	const route = await getRoute(
		new Token({
			chainId: flare.id,
			address: inputToken.address,
			decimals: inputToken.decimals
		}),
		new Token({ chainId: flare.id, address: outputToken.address, decimals: outputToken.decimals }),
		10n ** BigInt(inputToken.decimals), // 1 input token
		dataFetcher
	);
	const price = formatUnits(route.amountOutBI, outputToken.decimals);
	return price;
};

export const getAmountOut = async (
	inputToken: _Token,
	outputToken: _Token,
	amountIn: bigint,
	dataFetcher: DataFetcher
) => {
	const route = await getRoute(
		new Token({
			chainId: flare.id,
			address: inputToken.address,
			decimals: inputToken.decimals
		}),
		new Token({ chainId: flare.id, address: outputToken.address, decimals: outputToken.decimals }),
		amountIn,
		dataFetcher
	);
	const amountOut = formatUnits(route.amountOutBI, outputToken.decimals);
	return amountOut;
};

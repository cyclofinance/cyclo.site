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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const dataFetcher = new DataFetcher(flare.id, client as any);
	dataFetcher.startDataFetching();
	return dataFetcher;
};

export const getRoute = async (
	inputToken: Token,
	outputToken: Token,
	amountIn: bigint,
	dataFetcher: DataFetcher
): Promise<MultiRoute> => {
	const client = createPublicClient({
		chain: flare,
		transport: http('https://flare-api.flare.network/ext/C/rpc')
	});
	const gasPrice = await client.getGasPrice();

	await dataFetcher.fetchPoolsForToken(inputToken, outputToken);
	const pcMap = await dataFetcher.getCurrentPoolCodeMap(inputToken, outputToken);
	const route = Router.findBestRoute(
		pcMap,
		flare.id,
		inputToken,
		amountIn,
		outputToken,
		Number(gasPrice)
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

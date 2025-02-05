import { createPublicClient, http } from 'viem';
import { flare } from 'viem/chains';

export const getPublicClient = () =>
	createPublicClient({
		chain: flare,
		transport: http('https://rpc.ankr.com/flare')
	});

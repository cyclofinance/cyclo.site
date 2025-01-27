import type { BlockScoutData, Receipt } from '$lib/types';
import axios from 'axios';
import { formatEther } from 'ethers';
import { readErc1155BalanceOf } from '../../generated';
import type { Config } from '@wagmi/core';
import type { Hex } from 'viem';
import { myReceipts } from '$lib/stores';
import { tokens } from '$lib/stores';

export const getSingleTokenReceipts = async (
	address: string,
	erc1155Address: string,
	config: Config
) => {
	const query: string = `https://flare-explorer.flare.network/api/v2/addresses/${address}/nft?type=ERC-1155`;
	const getBalance = async (tokenId: bigint) => {
		const res = await readErc1155BalanceOf(config, {
			address: erc1155Address as Hex,
			args: [address as Hex, tokenId as bigint]
		});
		return res;
	};

	try {
		let data: Receipt[] = [];
		const response = await axios.get(query);
		data = response.data.items.map((item: BlockScoutData) => ({
			tokenId: item.id,
			balance: item.value,
			tokenAddress: item.token.address
		}));
		data = data.filter((item: Receipt) => item.tokenAddress === erc1155Address);
		data = data.map((item: Receipt) => ({
			...item,
			readableTokenId: formatEther(item.tokenId)
		}));

		data = await Promise.all(
			data.map(async (item: Receipt) => ({
				...item,
				balance: await getBalance(BigInt(item.tokenId))
			}))
		);
		data = data.filter((item: Receipt) => Number(item.balance) > 0);
		return data;
	} catch (error) {
		console.error('error getting receipts', error);
		return null;
	}
};

export const refreshAllReceipts = async (
	signerAddress: string,
	config: Config,
	setLoading: (loading: boolean) => void = () => {}
): Promise<Receipt[]> => {
	if (!signerAddress) return [];
	// Get receipts for both tokens
	const [cysFLRReceipts, cyWETHReceipts] = await Promise.all([
		getSingleTokenReceipts(signerAddress, tokens[0].receiptAddress, config),
		getSingleTokenReceipts(signerAddress, tokens[1].receiptAddress, config)
	]);

	if (!cysFLRReceipts && !cyWETHReceipts) {
		setLoading(false);
		myReceipts.set([]);
		return [];
	}

	// Add token identifier to each receipt
	const allReceipts = [
		...(cysFLRReceipts?.map((r) => ({ ...r, token: 'cysFLR' })) || []),
		...(cyWETHReceipts?.map((r) => ({ ...r, token: 'cyWETH' })) || [])
	];

	setLoading(false);
	myReceipts.set(allReceipts);
	return allReceipts;
};

import type { BlockScoutData, Receipt } from '$lib/types';
import axios from 'axios';
import { formatEther } from 'ethers';
import { readErc1155BalanceOf } from '../../generated';
import type { Config } from '@wagmi/core';
import type { Hex } from 'viem';

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

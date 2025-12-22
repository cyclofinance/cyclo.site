import type { BlockScoutData, Receipt } from '$lib/types';
import axios from 'axios';
import { formatEther } from 'ethers';
import { readErc1155BalanceOf } from '../../generated';
import type { Config } from '@wagmi/core';
import type { Hex } from 'viem';
import type { NetworkConfig } from '$lib/stores';

interface PaginationParams {
	items_count?: number;
	token_contract_address_hash?: string;
	token_id?: string;
	token_type?: string;
}

export const getSingleTokenReceipts = async (
	address: string,
	erc1155Address: string,
	config: Config,
	networkConfig: NetworkConfig,
	onProgress?: (page: number, totalItems: number) => void
) => {
	const getBalance = async (tokenId: bigint) => {
		const res = await readErc1155BalanceOf(config, {
			address: erc1155Address as Hex,
			args: [address as Hex, tokenId as bigint]
		});
		return res;
	};

	const fetchPage = async (
		paginationParams?: PaginationParams
	): Promise<{ items: Receipt[]; nextPageParams?: PaginationParams }> => {
		let query: string = `${networkConfig.explorerApiUrl}/v2/addresses/${address}/nft?type=ERC-1155`;

		// Add pagination parameters if provided
		if (paginationParams) {
			const params = new URLSearchParams();

			if (paginationParams.items_count) {
				params.append('items_count', paginationParams.items_count.toString());
			}
			if (paginationParams.token_contract_address_hash) {
				params.append('token_contract_address_hash', paginationParams.token_contract_address_hash);
			}
			if (paginationParams.token_id) {
				params.append('token_id', paginationParams.token_id);
			}
			if (paginationParams.token_type) {
				params.append('token_type', paginationParams.token_type);
			}

			if (params.toString()) {
				query += `&${params.toString()}`;
			}
		}

		const response = await axios.get(query);

		let pageData: Receipt[] = response.data.items.map((item: BlockScoutData) => ({
			tokenId: item.id,
			balance: item.value,
			tokenAddress: item.token.address_hash
		}));

		pageData = pageData.filter((item: Receipt) => item.tokenAddress === erc1155Address);
		pageData = pageData.map((item: Receipt) => ({
			...item,
			readableTokenId: formatEther(item.tokenId)
		}));

		pageData = await Promise.all(
			pageData.map(async (item: Receipt) => ({
				...item,
				balance: await getBalance(BigInt(item.tokenId))
			}))
		);

		pageData = pageData.filter((item: Receipt) => Number(item.balance) > 0);

		return {
			items: pageData,
			nextPageParams: response.data.next_page_params
		};
	};

	try {
		let allData: Receipt[] = [];
		let currentPageParams: PaginationParams | undefined = undefined;
		let pageCount = 0;

		// Fetch all pages until there are no more pages
		let hasMorePages = true;
		while (hasMorePages) {
			console.log(`Fetching page ${pageCount + 1}...`);

			const result = await fetchPage(currentPageParams);
			allData = [...allData, ...result.items];

			// Call progress callback if provided
			if (onProgress) {
				onProgress(pageCount + 1, allData.length);
			}

			if (!result.nextPageParams) {
				console.log(`No more pages. Total receipts fetched: ${allData.length}`);
				hasMorePages = false;
			} else {
				currentPageParams = result.nextPageParams;
				pageCount++;
			}
		}

		console.log(`Final data count: ${allData.length}`);
		return allData;
	} catch (error) {
		console.error('error getting receipts', error);
		return null;
	}
};

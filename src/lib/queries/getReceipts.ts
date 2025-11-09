import type { BlockScoutData, Receipt } from '$lib/types';
import axios from 'axios';
import { formatEther } from 'ethers';
import { readErc1155BalanceOf } from '../../generated';
import type { Config } from '@wagmi/core';
import type { Hex } from 'viem';
import { get } from 'svelte/store';
import { receiptSource } from '$lib/stores';
import type { ReceiptSource as StoreReceiptSource } from '$lib/stores';
import { env as publicEnv } from '$env/dynamic/public';

interface PaginationParams {
	items_count?: number;
	token_contract_address_hash?: string;
	token_id?: string;
	token_type?: string;
}

type ReceiptFetchOptions = {
	onProgress?: (page: number, totalItems: number) => void;
	source?: StoreReceiptSource;
};

type ReceiptFetchContext = {
	address: string;
	erc1155Address: Hex;
	config: Config;
	onProgress?: (page: number, totalItems: number) => void;
};

const ensureTrailingSlash = (value: string) => (value.endsWith('/') ? value : `${value}/`);

const fetchReceiptsFromBlockscout = async (
	{ address, erc1155Address, config, onProgress }: ReceiptFetchContext,
	source: Extract<StoreReceiptSource, { type: 'blockscout' }>
) => {
	const baseUrl = ensureTrailingSlash(source.baseUrl);

	const getBalance = async (tokenId: bigint) => {
		const res = await readErc1155BalanceOf(config, {
			address: erc1155Address as Hex,
			args: [address as Hex, tokenId]
		});
		return res;
	};

	const fetchPage = async (
		paginationParams?: PaginationParams
	): Promise<{ items: Receipt[]; nextPageParams?: PaginationParams }> => {
		const url = new URL(`api/v2/addresses/${address}/nft`, baseUrl);
		url.searchParams.set('type', 'ERC-1155');

		if (paginationParams) {
			if (paginationParams.items_count) {
				url.searchParams.set('items_count', paginationParams.items_count.toString());
			}
			if (paginationParams.token_contract_address_hash) {
				url.searchParams.set('token_contract_address_hash', paginationParams.token_contract_address_hash);
			}
			if (paginationParams.token_id) {
				url.searchParams.set('token_id', paginationParams.token_id);
			}
			if (paginationParams.token_type) {
				url.searchParams.set('token_type', paginationParams.token_type);
			}
		}

		const response = await axios.get(url.toString());

		const pageData = await Promise.all(
			response.data.items
				.filter(
					(item: BlockScoutData) =>
						item.token.address_hash?.toLowerCase() === erc1155Address.toLowerCase()
				)
				.map(async (item: BlockScoutData) => {
					const tokenIdBigInt = BigInt(item.id);
					const balance = await getBalance(tokenIdBigInt);

					if (balance <= 0n) return null;

					return {
						chainId: source.chainId.toString(),
						tokenAddress: erc1155Address,
						tokenId: item.id,
						balance,
						readableTokenId: formatEther(tokenIdBigInt)
					} satisfies Receipt;
				})
		);

		const filteredPageData = pageData.filter((item): item is Receipt => item !== null);

		return {
			items: filteredPageData,
			nextPageParams: response.data.next_page_params
		};
	};

	let allData: Receipt[] = [];
	let currentPageParams: PaginationParams | undefined = undefined;
	let pageCount = 0;
	let hasMorePages = true;

	while (hasMorePages) {
		const result = await fetchPage(currentPageParams);
		allData = [...allData, ...result.items];

		if (onProgress) {
			onProgress(pageCount + 1, allData.length);
		}

		if (!result.nextPageParams) {
			hasMorePages = false;
		} else {
			currentPageParams = result.nextPageParams;
			pageCount++;
		}
	}

	return allData;
};

type EtherscanResponse = {
	status: string;
	message: string;
	result: Array<{
		contractAddress: string;
		tokenID: string;
	}>;
};

const fetchReceiptsFromEtherscan = async (
	{ address, erc1155Address, config, onProgress }: ReceiptFetchContext,
	source: Extract<StoreReceiptSource, { type: 'etherscan' }>
) => {
	const pageSize = source.pageSize ?? 100;
	const apiKey = publicEnv.PUBLIC_ETHERSCAN_API_KEY;
	const lowerCaseContract = erc1155Address.toLowerCase();

	const getBalance = async (tokenId: bigint) => {
		const res = await readErc1155BalanceOf(config, {
			address: erc1155Address as Hex,
			args: [address as Hex, tokenId]
		});
		return res;
	};

	let page = 1;
	let allData: Receipt[] = [];
	let totalItems = 0;
	const seenTokenIds = new Set<string>();
	let continuePaging = true;

	while (continuePaging) {
		const params: Record<string, string | number | undefined> = {
			module: 'account',
			action: 'token1155tx',
			address,
			contractaddress: erc1155Address,
			chainid: source.chainId,
			page,
			offset: pageSize,
			sort: 'asc'
		};

		if (apiKey) {
			params.apikey = apiKey;
		}

		const { data } = await axios.get<EtherscanResponse>(source.baseUrl, {
			params
		});

		if (!data || data.status !== '1' || !Array.isArray(data.result) || data.result.length === 0) {
			break;
		}

		const pageReceipts: Receipt[] = [];

		for (const item of data.result) {
			if (item.contractAddress?.toLowerCase() !== lowerCaseContract) continue;
			if (seenTokenIds.has(item.tokenID)) continue;

			seenTokenIds.add(item.tokenID);

			const tokenIdBigInt = BigInt(item.tokenID);
			const balance = await getBalance(tokenIdBigInt);

			if (balance <= 0n) continue;

			pageReceipts.push({
				chainId: source.chainId.toString(),
				tokenAddress: erc1155Address,
				tokenId: item.tokenID,
				balance,
				readableTokenId: formatEther(tokenIdBigInt)
			});
		}

		totalItems += pageReceipts.length;
		allData = [...allData, ...pageReceipts];

		if (onProgress) {
			onProgress(page, totalItems);
		}

		if (data.result.length < pageSize) {
			continuePaging = false;
		} else {
			page += 1;
		}
	}

	return allData;
};

export const getSingleTokenReceipts = async (
	address: string,
	erc1155Address: Hex,
	config: Config,
	options: ReceiptFetchOptions = {}
) => {
	const { onProgress, source } = options;
	const activeSource = source ?? get(receiptSource);

	try {
		const context: ReceiptFetchContext = {
			address,
			erc1155Address,
			config,
			onProgress
		};

		if (activeSource.type === 'blockscout') {
			return await fetchReceiptsFromBlockscout(context, activeSource);
		}

		if (activeSource.type === 'etherscan') {
			return await fetchReceiptsFromEtherscan(context, activeSource);
		}

		throw new Error(`Unsupported receipt source type: ${(activeSource as { type: string }).type}`);
	} catch (error) {
		console.error('error getting receipts', error);
		return null;
	}
};

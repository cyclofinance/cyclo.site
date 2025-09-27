import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSingleTokenReceipts } from './getReceipts';
import axios from 'axios';
import { readErc1155BalanceOf } from '../../generated';
import type { BlockScoutData } from '$lib/types';
import type { Config } from '@wagmi/core';
import { formatEther } from 'ethers';
import { type Hex } from 'viem';

vi.mock('axios');
vi.mock('../../generated', () => ({
	readErc1155BalanceOf: vi.fn()
}));

describe('getSingleTokenReceipts', () => {
	const mockAddress = '0xMockAddress' as Hex;
	const mockErc1155Address = '0xMockERC1155Address' as Hex;
	const mockConfig = {} as Config;

	const mockData: BlockScoutData[] = [
		{
			token: { address: mockErc1155Address },
			id: '1000000000000000000',
			value: '1'
		},
		{
			token: { address: '0xAnotherERC1155Address' as Hex },
			id: '2000000000000000000',
			value: '0'
		}
	];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches and processes receipts correctly with pagination', async () => {
		// Mock first page with next_page_params
		vi.mocked(axios.get).mockResolvedValueOnce({
			data: {
				items: mockData,
				next_page_params: {
					items_count: 50,
					token_contract_address_hash: mockErc1155Address,
					token_id: '1000000000000000000',
					token_type: 'ERC-1155'
				}
			}
		});

		// Mock second page with no next_page_params (end of pagination)
		vi.mocked(axios.get).mockResolvedValueOnce({
			data: {
				items: [],
				next_page_params: null
			}
		});

		vi.mocked(readErc1155BalanceOf).mockResolvedValue(BigInt(1));

		const result = await getSingleTokenReceipts(mockAddress, mockErc1155Address, mockConfig);

		// Should have made 2 API calls due to pagination
		expect(axios.get).toHaveBeenCalledTimes(2);
		expect(axios.get).toHaveBeenNthCalledWith(
			1,
			`https://flare-explorer.flare.network/api/v2/addresses/${mockAddress}/nft?type=ERC-1155`
		);
		expect(axios.get).toHaveBeenNthCalledWith(
			2,
			`https://flare-explorer.flare.network/api/v2/addresses/${mockAddress}/nft?type=ERC-1155&items_count=50&token_contract_address_hash=${mockErc1155Address}&token_id=1000000000000000000&token_type=ERC-1155`
		);

		expect(readErc1155BalanceOf).toHaveBeenCalled();

		expect(result).toEqual([
			{
				tokenAddress: mockErc1155Address,
				tokenId: '1000000000000000000',
				balance: BigInt(1),
				readableTokenId: formatEther('1000000000000000000')
			}
		]);
	});

	it('filters out items with zero balance', async () => {
		vi.mocked(axios.get).mockResolvedValue({
			data: {
				items: mockData,
				next_page_params: null
			}
		});

		vi.mocked(readErc1155BalanceOf).mockResolvedValue(BigInt(0));

		const result = await getSingleTokenReceipts(mockAddress, mockErc1155Address, mockConfig);
		expect(result).toEqual([]);
	});

	it('returns null and logs an error if an exception occurs', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

		const result = await getSingleTokenReceipts(mockAddress, mockErc1155Address, mockConfig);

		expect(result).toBeNull();
		expect(consoleErrorSpy).toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});

	it('calls progress callback during pagination', async () => {
		const progressCallback = vi.fn();

		// Mock first page with next_page_params
		vi.mocked(axios.get).mockResolvedValueOnce({
			data: {
				items: mockData,
				next_page_params: {
					items_count: 50,
					token_contract_address_hash: mockErc1155Address,
					token_id: '1000000000000000000',
					token_type: 'ERC-1155'
				}
			}
		});

		// Mock second page with no next_page_params (end of pagination)
		vi.mocked(axios.get).mockResolvedValueOnce({
			data: {
				items: [],
				next_page_params: null
			}
		});

		vi.mocked(readErc1155BalanceOf).mockResolvedValue(BigInt(1));

		await getSingleTokenReceipts(mockAddress, mockErc1155Address, mockConfig, progressCallback);

		// Should have called progress callback for each page
		expect(progressCallback).toHaveBeenCalledWith(1, 1); // First page
		expect(progressCallback).toHaveBeenCalledWith(2, 1); // Second page
	});
});

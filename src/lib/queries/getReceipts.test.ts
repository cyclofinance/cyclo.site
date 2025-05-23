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

	it('fetches and processes receipts correctly', async () => {
		vi.mocked(axios.get).mockResolvedValue({
			data: {
				items: mockData
			}
		});

		vi.mocked(readErc1155BalanceOf).mockResolvedValueOnce(BigInt(1));

		const result = await getSingleTokenReceipts(mockAddress, mockErc1155Address, mockConfig);

		expect(axios.get).toHaveBeenCalledWith(
			`https://flare-explorer.flare.network/api/v2/addresses/${mockAddress}/nft?type=ERC-1155`
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
				items: mockData
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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAndStartDataFetcher, getRoute, getPrice } from './index';
import { createPublicClient, formatUnits, http, type PublicClient } from 'viem';
import { flare } from '@wagmi/core/chains';
import { DataFetcher, Router } from 'sushi/router';
import type { Token } from '$lib/types';
import { Token as SushiToken } from 'sushi/currency';
import type { MultiRoute } from 'sushi/tines';

// Mock viem
vi.mock('viem', () => ({
	createPublicClient: vi.fn(),
	formatUnits: vi.fn(),
	http: vi.fn()
}));

// Mock sushi/router
vi.mock('sushi/router', () => ({
	DataFetcher: vi.fn(),
	Router: {
		findBestRoute: vi.fn()
	}
}));

// Mock sushi/currency
vi.mock('sushi/currency', () => ({
	Token: vi.fn()
}));

describe('prices/index', () => {
	const mockClient = {
		getGasPrice: vi.fn()
	};

	const mockDataFetcher = {
		web3Client: mockClient,
		startDataFetching: vi.fn(),
		stopDataFetching: vi.fn(),
		fetchPoolsForToken: vi.fn(),
		getCurrentPoolCodeMap: vi.fn()
	};

	const mockRoute = {
		amountOutBI: 1500000000000000000n, // 1.5 output tokens
		status: 'Success'
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup mocks
		vi.mocked(createPublicClient).mockReturnValue(mockClient as unknown as PublicClient);
		vi.mocked(http).mockReturnValue({
			config: { type: 'http' },
			request: vi.fn(),
			value: { url: 'https://flare-api.flare.network/ext/C/rpc' }
		} as unknown as ReturnType<typeof http>);
		vi.mocked(DataFetcher).mockImplementation(() => mockDataFetcher as unknown as DataFetcher);
		vi.mocked(SushiToken).mockImplementation(
			({ chainId, address, decimals }) => ({ chainId, address, decimals }) as unknown as SushiToken
		);
		vi.mocked(Router.findBestRoute).mockReturnValue(mockRoute as unknown as MultiRoute);
		vi.mocked(formatUnits).mockReturnValue('1.5');
		mockClient.getGasPrice.mockResolvedValue(1000000000n); // 1 gwei
		mockDataFetcher.getCurrentPoolCodeMap.mockReturnValue(new Map());
	});

	describe('getAndStartDataFetcher', () => {
		it('should create a public client with the correct configuration', () => {
			getAndStartDataFetcher();

			expect(createPublicClient).toHaveBeenCalledWith({
				chain: flare,
				transport: expect.objectContaining({
					config: { type: 'http' },
					value: { url: 'https://flare-api.flare.network/ext/C/rpc' }
				})
			});
			expect(http).toHaveBeenCalledWith('https://flare-api.flare.network/ext/C/rpc');
		});

		it('should create a DataFetcher with the correct parameters', () => {
			getAndStartDataFetcher();

			expect(DataFetcher).toHaveBeenCalledWith(flare.id, mockClient);
		});

		it('should start data fetching', () => {
			getAndStartDataFetcher();

			expect(mockDataFetcher.startDataFetching).toHaveBeenCalled();
		});

		it('should return the data fetcher', () => {
			const result = getAndStartDataFetcher();

			expect(result).toBe(mockDataFetcher);
		});
	});

	describe('getRoute', () => {
		const mockInputToken = { chainId: flare.id, address: '0xabc123', decimals: 18 };
		const mockOutputToken = { chainId: flare.id, address: '0xdef456', decimals: 18 };
		const mockAmountIn = 1000000000000000000n; // 1 input token

		it('should create a public client with the correct configuration', async () => {
			await getRoute(
				mockInputToken as unknown as SushiToken,
				mockOutputToken as unknown as SushiToken,
				mockAmountIn,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(mockDataFetcher.web3Client.getGasPrice).toHaveBeenCalledOnce();
		});

		it('should fetch pools for the tokens', async () => {
			await getRoute(
				mockInputToken as unknown as SushiToken,
				mockOutputToken as unknown as SushiToken,
				mockAmountIn,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(mockDataFetcher.fetchPoolsForToken).toHaveBeenCalledWith(
				mockInputToken,
				mockOutputToken
			);
		});

		it('should get the current pool code map', async () => {
			await getRoute(
				mockInputToken as unknown as SushiToken,
				mockOutputToken as unknown as SushiToken,
				mockAmountIn,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(mockDataFetcher.getCurrentPoolCodeMap).toHaveBeenCalledWith(
				mockInputToken,
				mockOutputToken
			);
		});

		it('should find the best route', async () => {
			await getRoute(
				mockInputToken as unknown as SushiToken,
				mockOutputToken as unknown as SushiToken,
				mockAmountIn,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(Router.findBestRoute).toHaveBeenCalledWith(
				new Map(),
				flare.id,
				mockInputToken,
				mockAmountIn,
				mockOutputToken,
				1000000000,
				undefined,
				undefined,
				undefined,
				'single'
			);
		});

		it('should return the route', async () => {
			const result = await getRoute(
				mockInputToken as unknown as SushiToken,
				mockOutputToken as unknown as SushiToken,
				mockAmountIn,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(result).toBe(mockRoute);
		});
	});

	describe('getPrice', () => {
		const mockInputToken = {
			address: '0xabc123' as `0x${string}`,
			decimals: 18,
			symbol: 'TEST1',
			name: 'Test Token 1'
		};

		const mockOutputToken = {
			address: '0xdef456' as `0x${string}`,
			decimals: 18,
			symbol: 'TEST2',
			name: 'Test Token 2'
		};

		it('should create Token instances with the correct parameters', async () => {
			await getPrice(
				mockInputToken as unknown as Token,
				mockOutputToken as unknown as Token,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(SushiToken).toHaveBeenCalledWith({
				chainId: flare.id,
				address: mockInputToken.address,
				decimals: mockInputToken.decimals
			});

			expect(SushiToken).toHaveBeenCalledWith({
				chainId: flare.id,
				address: mockOutputToken.address,
				decimals: mockOutputToken.decimals
			});
		});

		it('should get the route with 1 input token amount', async () => {
			await getPrice(
				mockInputToken as unknown as Token,
				mockOutputToken as unknown as Token,
				mockDataFetcher as unknown as DataFetcher
			);

			// Second call to Token is for the output token
			const inputTokenInstance = vi.mocked(SushiToken).mock.results[0].value;
			const outputTokenInstance = vi.mocked(SushiToken).mock.results[1].value;

			expect(mockDataFetcher.fetchPoolsForToken).toHaveBeenCalledWith(
				inputTokenInstance,
				outputTokenInstance
			);

			expect(Router.findBestRoute).toHaveBeenCalledWith(
				new Map(),
				flare.id,
				inputTokenInstance,
				10n ** 18n, // 1 token with 18 decimals
				outputTokenInstance,
				1000000000,
				undefined,
				undefined,
				undefined,
				'single'
			);
		});

		it('should format the output amount correctly', async () => {
			await getPrice(
				mockInputToken as unknown as Token,
				mockOutputToken as unknown as Token,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(formatUnits).toHaveBeenCalledWith(mockRoute.amountOutBI, mockOutputToken.decimals);
		});

		it('should return the formatted price', async () => {
			const result = await getPrice(
				mockInputToken as unknown as Token,
				mockOutputToken as unknown as Token,
				mockDataFetcher as unknown as DataFetcher
			);

			expect(result).toBe('1.5');
		});
	});
});

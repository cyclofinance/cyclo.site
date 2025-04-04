import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TradePrice from './TradePrice.svelte';
import { getPrice } from '$lib/trade/prices';
import { useDataFetcher } from '$lib/dataFetcher';
import { DataFetcher } from 'sushi';
import { flare } from '@wagmi/core/chains';

// Mock the trade/prices module
vi.mock('$lib/trade/prices', () => ({
	getPrice: vi.fn()
}));

// Mock the dataFetcher module
vi.mock('$lib/dataFetcher', () => ({
	useDataFetcher: vi.fn()
}));

describe('TradePrice Component', () => {
	const mockInputToken = {
		address: '0xabc123' as `0x${string}`,
		symbol: 'TEST1',
		name: 'Test Token 1',
		decimals: 18
	};

	const mockOutputToken = {
		address: '0xdef456' as `0x${string}`,
		symbol: 'TEST2',
		name: 'Test Token 2',
		decimals: 18
	};

	const mockDataFetcher = new DataFetcher(flare.id);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useDataFetcher).mockReturnValue(mockDataFetcher);
	});

	it('should show loading state while fetching price', async () => {
		// Make the price fetch take some time
		vi.mocked(getPrice).mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve('1.5 TEST2 per TEST1'), 100);
				})
		);

		render(TradePrice, {
			props: {
				inputToken: mockInputToken,
				outputToken: mockOutputToken
			}
		});

		expect(screen.getByText('Loading market price...')).toBeInTheDocument();
	});

	it('should display the price when fetched', async () => {
		vi.mocked(getPrice).mockResolvedValue('1.5 TEST2 per TEST1');

		render(TradePrice, {
			props: {
				inputToken: mockInputToken,
				outputToken: mockOutputToken
			}
		});

		await waitFor(() => {
			expect(screen.getByText('Current price: 1.5 TEST2 per TEST1')).toBeInTheDocument();
		});
	});

	it('should call getPrice with the correct tokens', async () => {
		vi.mocked(getPrice).mockResolvedValue('1.5 TEST2 per TEST1');

		render(TradePrice, {
			props: {
				inputToken: mockInputToken,
				outputToken: mockOutputToken
			}
		});

		await waitFor(() => {
			expect(getPrice).toHaveBeenCalledWith(mockOutputToken, mockInputToken, mockDataFetcher);
		});
	});

	it('should update price when tokens change', async () => {
		vi.mocked(getPrice).mockResolvedValue('1.5 TEST2 per TEST1');

		const { component } = render(TradePrice, {
			props: {
				inputToken: mockInputToken,
				outputToken: mockOutputToken
			}
		});

		await waitFor(() => {
			expect(screen.getByText('Current price: 1.5 TEST2 per TEST1')).toBeInTheDocument();
		});

		// Change the price return value for the new token pair
		vi.mocked(getPrice).mockResolvedValue('2.0 TEST3 per TEST1');

		// Change the output token
		const newOutputToken = {
			...mockOutputToken,
			symbol: 'TEST3',
			address: '0xghi789' as `0x${string}`
		};
		await component.$set({ outputToken: newOutputToken });

		await waitFor(() => {
			expect(screen.getByText('Current price: 2.0 TEST3 per TEST1')).toBeInTheDocument();
		});
	});
});

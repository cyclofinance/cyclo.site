import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DataFetcherProvider from './DataFetcherProvider.svelte';
import { getAndStartDataFetcher } from '$lib/trade/prices';
import DataFetcherTest from './DataFetcherTest.svelte';
import { DataFetcher } from 'sushi';
import { flare } from '@wagmi/core/chains';
// Mock the data fetcher module
vi.mock('$lib/trade/prices', () => ({
	getAndStartDataFetcher: vi.fn()
}));

describe('DataFetcherProvider Component', () => {
	const mockDataFetcher = new DataFetcher(flare.id);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getAndStartDataFetcher).mockResolvedValue(mockDataFetcher);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should call getAndStartDataFetcher on mount', async () => {
		render(DataFetcherProvider);

		// Wait for the next tick to allow the onMount callback to execute
		await vi.waitFor(() => {
			expect(getAndStartDataFetcher).toHaveBeenCalledTimes(1);
		});
	});

	it('should not render slot content until data fetcher is available', () => {
		render(DataFetcherTest);

		expect(screen.queryByTestId('slot-content')).not.toBeInTheDocument();
	});

	it('should render slot content when data fetcher is available', async () => {
		render(DataFetcherTest);

		// if we wait until after onMount, the slot content will be there
		await vi.waitFor(() => {
			expect(screen.getByTestId('slot-content')).toBeInTheDocument();
			expect(screen.getByTestId('slot-content')).toHaveTextContent('Data Fetcher is available');
		});
	});

	it('should set the data fetcher in context', async () => {
		render(DataFetcherTest);

		await vi.waitFor(() => {
			expect(screen.getByTestId('data-fetcher-available')).toBeInTheDocument();
		});
	});
});

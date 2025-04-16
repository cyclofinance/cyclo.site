import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDataFetcher } from './dataFetcher';
import { getContext } from 'svelte';
import { get, writable } from 'svelte/store';
import { DataFetcher } from 'sushi';
import { flare } from '@wagmi/core/chains';

// Mock Svelte's getContext and get functions
vi.mock('svelte', async () => {
	const actual = await vi.importActual('svelte');
	return {
		...actual,
		getContext: vi.fn()
	};
});

vi.mock('svelte/store', async () => {
	const actual = await vi.importActual('svelte/store');
	return {
		...actual,
		get: vi.fn()
	};
});

describe('dataFetcher', () => {
	const mockDataFetcher = new DataFetcher(flare.id);
	const mockStore = writable(mockDataFetcher);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getContext).mockReturnValue(mockStore);
		vi.mocked(get).mockReturnValue(mockDataFetcher);
	});

	it('should retrieve the DataFetcher from context', () => {
		const dataFetcher = useDataFetcher();

		expect(getContext).toHaveBeenCalledWith('dataFetcher');
		expect(dataFetcher).toBe(mockDataFetcher);
	});

	it('should return the value from the store', () => {
		const dataFetcher = useDataFetcher();

		expect(get).toHaveBeenCalledWith(mockStore);
		expect(dataFetcher).toBe(mockDataFetcher);
	});
});

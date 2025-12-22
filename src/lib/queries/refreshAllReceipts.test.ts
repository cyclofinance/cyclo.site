import { vi, it, expect, beforeEach, describe } from 'vitest';
import { refreshAllReceipts } from './refreshAllReceipts';

const { mockTokens, mockNetworkConfig } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	const tokens = writable([]);
	const selectedNetwork = writable({
		chain: { id: 14 },
		rewardsSubgraphUrl: 'http://mocked-subgraph-url'
	});
	return { mockTokens: tokens, mockNetworkConfig: selectedNetwork };
});

vi.mock('$lib/stores', () => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	return {
		myReceipts: writable([]),
		tokens: mockTokens,
		selectedNetwork: mockNetworkConfig
	};
});

vi.mock('$lib/queries/getReceipts', () => ({
	getSingleTokenReceipts: vi.fn()
}));

global.fetch = vi.fn();

// eslint-disable-next-line
let loading = true;
const setLoading = (_loading: boolean) => {
	loading = _loading;
};

describe('refreshAllReceipts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return empty array if signerAddress is not provided', async () => {
		const result = await refreshAllReceipts('', setLoading);
		expect(result).toEqual([]);
	});
});

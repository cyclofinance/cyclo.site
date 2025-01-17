import { vi, it, expect, beforeEach, describe } from 'vitest';
import { refreshAllReceipts } from './refreshAllReceipts';
import type { Config } from '@wagmi/core';

vi.mock('$lib/stores', () => ({
	myReceipts: vi.fn()
}));

vi.mock('$lib/queries/getReceipts', () => ({
	getSingleTokenReceipts: vi.fn()
}));

let loading = true;
const setLoading = (_loading: boolean) => {
	loading = _loading;
};

describe('getSingleTokenReceipts', () => {
	let config: Config;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return empty array if signerAddress is not provided', async () => {
		const result = await refreshAllReceipts('', config, setLoading);
		expect(result).toEqual([]);
	});

});

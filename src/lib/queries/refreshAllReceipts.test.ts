import { vi, it, expect, beforeEach, describe } from 'vitest';
import { refreshAllReceipts } from './refreshAllReceipts';

vi.mock('$lib/stores', () => ({
	myReceipts: vi.fn()
}));

vi.mock('$lib/queries/getReceipts', () => ({
	getSingleTokenReceipts: vi.fn()
}));

// eslint-disable-next-line
let loading = true;
const setLoading = (_loading: boolean) => {
	loading = _loading;
};

describe('getSingleTokenReceipts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return empty array if signerAddress is not provided', async () => {
		const result = await refreshAllReceipts('', setLoading);
		expect(result).toEqual([]);
	});
});

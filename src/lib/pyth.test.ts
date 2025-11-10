import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractParsedTimes, extractPublishTime, fetchUpdateBlobs, toU64 } from './pyth';

describe('pyth helpers', () => {
	describe('toU64', () => {
		it('clamps negative values to zero', () => {
			expect(toU64(-5n)).toBe(0n);
		});

		it('returns the same value when already in range', () => {
			expect(toU64(42n)).toBe(42n);
		});

		it('caps values that exceed uint64 max', () => {
			const beyond = (1n << 64n) + 100n;
			expect(toU64(beyond)).toBe((1n << 64n) - 1n);
		});
	});

	describe('extractParsedTimes', () => {
		it('reads publish times from parsed payloads', () => {
			const parsed = {
				parsed: {
					price_updates: [
						{
							price_id: '0xABCDEF',
							publish_time: 1700000000
						}
					]
				}
			};

			expect(extractParsedTimes(parsed)).toEqual({ '0xabcdef': 1700000000n });
		});

		it('returns an empty object when no updates exist', () => {
			expect(extractParsedTimes({})).toEqual({});
		});
	});

	describe('extractPublishTime', () => {
		it('extracts from tuple responses', () => {
			const tuple: [bigint, bigint, number, bigint] = [0n, 0n, 0, 999n];
			expect(extractPublishTime(tuple)).toBe(999n);
		});

		it('extracts from object responses', () => {
			const obj = {
				publishTime: 123,
				price: { publishTime: 456 }
			};
			expect(extractPublishTime(obj)).toBe(123n);
		});

		it('handles string publish times gracefully', () => {
			const obj = { publish_time: '789' };
			expect(extractPublishTime(obj)).toBe(789n);
		});

		it('returns zero when no publish time can be determined', () => {
			expect(extractPublishTime(undefined)).toBe(0n);
		});
	});

	describe('fetchUpdateBlobs', () => {
		const originalFetch = globalThis.fetch;

		beforeEach(() => {
			vi.restoreAllMocks();
		});

		afterEach(() => {
			globalThis.fetch = originalFetch;
		});

		it('returns update blobs on the first successful attempt', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						binary: ['0xdeadbeef'],
						parsed: { price_updates: [] }
					})
			});
			globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

			const { updateData, parsed } = await fetchUpdateBlobs(['0x1234']);

			expect(updateData).toEqual(['0xdeadbeef']);
			expect(parsed).toEqual({ price_updates: [] });
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('falls back through attempts and converts base64 responses', async () => {
			const responses = [
				{ ok: true, json: () => Promise.resolve({}) },
				{ ok: true, json: () => Promise.resolve({}) },
				{
					ok: true,
					json: () =>
						Promise.resolve({
							binary: ['AQID'],
							parsed: { price_updates: [] }
						})
				}
			];

			const mockFetch = vi
				.fn()
				.mockImplementation(() => responses[mockFetch.mock.calls.length] ?? responses.at(-1));

			globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

			const { updateData } = await fetchUpdateBlobs(['0x1234']);

			expect(updateData).toEqual(['0xAQID']);
			expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
		});

		it('throws when no update data is returned', async () => {
			const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
			globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

			await expect(fetchUpdateBlobs(['0x1234'])).rejects.toThrow(/returned no update data/);
			expect(mockFetch).toHaveBeenCalledTimes(4);
		});
	});
});

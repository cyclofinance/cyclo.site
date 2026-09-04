import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCyTokenUsdAtBlocks } from './cyTokenPriceAtLock';
import type { CyToken } from '$lib/types';

const token = { name: 'cysFLR', decimals: 18 } as CyToken;

const memoryStorage = () => {
	const m = new Map<string, string>();
	return {
		getItem: (k: string) => m.get(k) ?? null,
		setItem: (k: string, v: string) => void m.set(k, v),
		removeItem: (k: string) => void m.delete(k),
		clear: () => m.clear(),
		key: () => null,
		length: 0
	} as unknown as Storage;
};

describe('getCyTokenUsdAtBlocks', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', memoryStorage());
	});

	it('asks the chain once per DISTINCT block and returns a price per block', async () => {
		const fetchAt = vi.fn(async (_t: CyToken, block: number) => BigInt(block) * 10n);
		const out = await getCyTokenUsdAtBlocks(token, [100, 200, 100, 200, 300], { fetchAt });
		expect(fetchAt).toHaveBeenCalledTimes(3);
		expect(out.get(100)).toBe(1000n);
		expect(out.get(300)).toBe(3000n);
	});

	it('caches KNOWN prices for good and never re-asks for them', async () => {
		const fetchAt = vi.fn(async () => 42n);
		await getCyTokenUsdAtBlocks(token, [7], { fetchAt });
		const again = vi.fn(async () => 999n);
		const out = await getCyTokenUsdAtBlocks(token, [7], { fetchAt: again });
		expect(again).not.toHaveBeenCalled();
		expect(out.get(7)).toBe(42n);
	});

	it('does NOT cache an unknown (null) price — a transient failure must be retried next time', async () => {
		const first = vi.fn(async () => null);
		const out1 = await getCyTokenUsdAtBlocks(token, [9], { fetchAt: first });
		expect(out1.get(9)).toBeNull();
		const second = vi.fn(async () => 5n);
		const out2 = await getCyTokenUsdAtBlocks(token, [9], { fetchAt: second });
		expect(second).toHaveBeenCalledTimes(1);
		expect(out2.get(9)).toBe(5n);
	});

	it('stops early when aborted', async () => {
		const ctrl = new AbortController();
		const fetchAt = vi.fn(async () => {
			ctrl.abort();
			return 1n;
		});
		const out = await getCyTokenUsdAtBlocks(token, [1, 2, 3, 4, 5, 6, 7, 8], {
			fetchAt,
			signal: ctrl.signal
		});
		expect(fetchAt.mock.calls.length).toBeLessThan(8);
		expect(out.size).toBeLessThan(8);
	});
});

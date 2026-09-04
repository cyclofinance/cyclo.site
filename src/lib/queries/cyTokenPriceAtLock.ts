import type { CyToken } from '$lib/types';
import { getCyTokenUsdPriceAt } from './getPositionPrices';

/**
 * cyToken market price at each position's lock block.
 *
 * A past block never changes, so a price we once read for (token, block) is
 * cached in localStorage for good. Only KNOWN prices are cached — a null can
 * mean "no pool yet" or "RPC hiccup", and we would rather ask again next time
 * than freeze a transient failure into "unknown forever".
 *
 * Many receipts share a lock block (batched deposits), so the work is per
 * distinct block, not per receipt, and runs a few at a time so a wallet with
 * hundreds of positions does not hammer the public RPC.
 */

const CONCURRENCY = 4;

const key = (token: CyToken, block: number) => `cyclo-manager.cyusd.${token.name}.${block}`;

const readCache = (token: CyToken, block: number): bigint | null => {
	try {
		const v = localStorage.getItem(key(token, block));
		return v === null ? null : BigInt(v);
	} catch {
		return null;
	}
};

const writeCache = (token: CyToken, block: number, price: bigint) => {
	try {
		localStorage.setItem(key(token, block), price.toString());
	} catch {
		/* storage unavailable: we simply refetch next time */
	}
};

export type PriceAtBlockMap = Map<number, bigint | null>;

export const getCyTokenUsdAtBlocks = async (
	token: CyToken,
	blocks: number[],
	options?: { signal?: AbortSignal; fetchAt?: typeof getCyTokenUsdPriceAt }
): Promise<PriceAtBlockMap> => {
	const fetchAt = options?.fetchAt ?? getCyTokenUsdPriceAt;
	const out: PriceAtBlockMap = new Map();
	const todo: number[] = [];

	for (const block of new Set(blocks)) {
		const cached = readCache(token, block);
		if (cached !== null) out.set(block, cached);
		else todo.push(block);
	}

	let i = 0;
	const worker = async () => {
		while (i < todo.length) {
			if (options?.signal?.aborted) return;
			const block = todo[i++];
			const price = await fetchAt(token, block);
			out.set(block, price);
			if (price !== null) writeCache(token, block, price);
		}
	};
	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));

	return out;
};

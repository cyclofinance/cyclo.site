import { describe, it, expect } from 'vitest';
import {
	buildTokenGroup,
	cyTokenShortfall,
	formatAmount,
	formatUsd,
	heroNetToClose,
	sortBestToCloseFirst,
	visibleGroups,
	LOADING_PRICES,
	type PositionRow,
	type TokenGroup
} from './positions';
import type { CyToken, Receipt } from '$lib/types';

const ONE = 10n ** 18n;
const token = {
	name: 'cysFLR',
	symbol: 'cysFLR',
	decimals: 18,
	underlyingSymbol: 'sFLR'
} as CyToken;

const receipt = (tokenId: bigint, balance: bigint): Receipt => ({
	chainId: '14',
	tokenAddress: '0xr',
	tokenId: tokenId.toString(),
	balance,
	token: 'cysFLR'
});

const row = (net: bigint | null, lockPrice = ONE): PositionRow => ({
	receipt: receipt(lockPrice, ONE),
	underlyingAmount: ONE,
	lockPriceUsd: lockPrice,
	held: null,
	collateralPnlUsd: null,
	cyTokenPnlUsd: null,
	netToCloseUsd: net
});

describe('sortBestToCloseFirst', () => {
	it('puts the highest net-to-close first and unknowns last', () => {
		const sorted = sortBestToCloseFirst([row(null), row(5n), row(50n), row(-3n)]);
		expect(sorted.map((r) => r.netToCloseUsd)).toEqual([50n, 5n, -3n, null]);
	});
	it('breaks ties by the lowest lock price', () => {
		const sorted = sortBestToCloseFirst([row(1n, 3n), row(1n, 1n), row(1n, 2n)]);
		expect(sorted.map((r) => r.lockPriceUsd)).toEqual([1n, 2n, 3n]);
	});
});

describe('buildTokenGroup', () => {
	// lock at $0.02, now $0.04, cyToken trades at $0.10: 100 sFLR locked → 2 cysFLR minted
	const lockPrice = 2n * 10n ** 16n;
	const minted = 2n * ONE;
	const prices = { underlyingUsdNow: 4n * 10n ** 16n, cyTokenUsdNow: 10n ** 17n, settled: true };

	it('computes rows, totals and net-to-close from receipts', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map([[lockPrice.toString(), 0]]),
			prices,
			nowMs: 3 * 86_400_000
		});
		expect(g.count).toBe(1);
		expect(g.lockedUnderlying).toBe(100n * ONE);
		expect(g.mintedCyToken).toBe(minted);
		// 100 × 0.04 − 2 × 0.10 = 4 − 0.2 = 3.8
		expect(g.netToCloseUsd).toBe(38n * 10n ** 17n);
		expect(g.rows[0].held).toBe(3);
		expect(g.rows[0].receipt.totalsFlr).toBe(100n * ONE);
		// 100 sFLR × $0.04 = $4 of collateral at today's oracle price
		expect(g.collateralValueUsd).toBe(4n * ONE);
		expect(g.hidden).toBe(false);
	});

	it('collateral value is unknown while the oracle price is unknown', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map(),
			prices: { underlyingUsdNow: null, cyTokenUsdNow: 10n ** 17n, settled: true },
			nowMs: 0
		});
		expect(g.collateralValueUsd).toBeNull();
	});

	it('is HIDDEN only once the price probe settled with no pool', () => {
		const receipts = [receipt(lockPrice, minted)];
		const loading = buildTokenGroup({
			token,
			receipts,
			lockDates: new Map(),
			prices: LOADING_PRICES,
			nowMs: 0
		});
		expect(loading.hidden).toBe(false);
		expect(loading.netToCloseUsd).toBeNull();

		const noPool = buildTokenGroup({
			token,
			receipts,
			lockDates: new Map(),
			prices: { underlyingUsdNow: ONE, cyTokenUsdNow: null, settled: true },
			nowMs: 0
		});
		expect(noPool.hidden).toBe(true);
	});

	it('drops zero-balance and zero-tokenId receipts', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, 0n), receipt(0n, minted)],
			lockDates: new Map(),
			prices,
			nowMs: 0
		});
		expect(g.count).toBe(0);
	});
});

describe('heroNetToClose / visibleGroups', () => {
	const group = (net: bigint | null, count = 1, hidden = false): TokenGroup =>
		({
			token,
			rows: [],
			count,
			lockedUnderlying: 0n,
			mintedCyToken: 0n,
			collateralValueUsd: null,
			netToCloseUsd: net,
			hidden
		}) as TokenGroup;

	it('sums only visible groups and ignores hidden and empty ones', () => {
		const groups = [group(10n), group(5n), group(999n, 1, true), group(null, 0)];
		expect(visibleGroups(groups)).toHaveLength(2);
		expect(heroNetToClose(groups)).toBe(15n);
	});
	it('is unknown when any visible group is unknown, and when nothing is visible', () => {
		expect(heroNetToClose([group(10n), group(null)])).toBeNull();
		expect(heroNetToClose([])).toBeNull();
		expect(heroNetToClose([group(1n, 1, true)])).toBeNull();
	});
});

describe('cyTokenShortfall', () => {
	it('is what is still missing, never negative', () => {
		expect(cyTokenShortfall(100n, 40n)).toBe(60n);
		expect(cyTokenShortfall(100n, 100n)).toBe(0n);
		expect(cyTokenShortfall(100n, 250n)).toBe(0n);
	});
});

describe('formatting', () => {
	it('formatUsd renders unknown as a dash and signs known values', () => {
		expect(formatUsd(null)).toBe('—');
		expect(formatUsd(12345n * 10n ** 17n)).toBe('+$1,234.50');
		expect(formatUsd(-5n * 10n ** 17n)).toBe('−$0.5000');
		expect(formatUsd(0n)).toBe('$0.00');
	});
	it('formatAmount truncates, never rounds up', () => {
		expect(formatAmount(1_999_999_999_999_999_999n, 18)).toBe('1.99');
		expect(formatAmount(10141802_855534501000000000n, 18)).toBe('10,141,802.85');
		expect(formatAmount(5_000_000n, 6)).toBe('5');
	});
	it('formatAmount never shows dust as zero', () => {
		expect(formatAmount(1234n * 10n ** 12n, 18)).toBe('0.001234');
		expect(formatAmount(1n, 18)).toBe('<0.000001');
		expect(formatAmount(0n, 18)).toBe('0');
	});
});

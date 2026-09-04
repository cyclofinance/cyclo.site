import { describe, it, expect } from 'vitest';
import {
	buildTokenGroup,
	cyTokenShortfall,
	formatAmount,
	formatPct,
	ratio,
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
	netToCloseUsd: net,
	underlyingUsdNow: null,
	collateralValueUsd: null,
	cyTokenRepayUsd: null,
	costBasisUsd: ONE,
	pnlPct: null,
	pricePct: null,
	cyDiscountPct: null,
	cyTokenUsdNow: null,
	cyTokenUsdAtLock: null,
	payoffSavedUsd: null,
	payoffDiscountPct: null
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

		const r = g.rows[0];
		expect(r.collateralValueUsd).toBe(4n * ONE); // A × Pnow
		expect(r.cyTokenRepayUsd).toBe(2n * 10n ** 17n); // 2 cysFLR × $0.10
		expect(r.costBasisUsd).toBe(2n * ONE); // M at $1 nominal = A × Plock
		expect(r.pnlPct).toBeCloseTo(1.9, 6); // 3.8 / 2
		expect(r.pricePct).toBeCloseTo(1.0, 6); // 0.02 → 0.04
		expect(r.cyDiscountPct).toBeCloseTo(0.9, 6); // $0.10 is 90% below $1
	});

	it('payoff vs at-lock: cyToken was $0.68 at lock, $0.10 now → 2 tokens pay off $1.16 less (85.3%)', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map(),
			prices,
			nowMs: 0,
			cyTokenAtLock: new Map([[lockPrice.toString(), 68n * 10n ** 16n]])
		});
		const r = g.rows[0];
		expect(r.cyTokenUsdAtLock).toBe(68n * 10n ** 16n);
		expect(r.payoffSavedUsd).toBe(116n * 10n ** 16n); // 2 × (0.68 − 0.10)
		expect(r.payoffDiscountPct).toBeCloseTo(0.852941, 5); // 0.58 / 0.68
		expect(g.payoffSavedUsd).toBe(116n * 10n ** 16n);
	});

	it('payoff vs at-lock is unknown without an at-lock price, and the group sum goes unknown with it', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted), receipt(lockPrice + 1n, minted)],
			lockDates: new Map(),
			prices,
			nowMs: 0,
			cyTokenAtLock: new Map([[lockPrice.toString(), 68n * 10n ** 16n]])
		});
		const known = g.rows.find((r) => r.receipt.tokenId === lockPrice.toString())!;
		const unknown = g.rows.find((r) => r.receipt.tokenId !== lockPrice.toString())!;
		expect(known.payoffSavedUsd).not.toBeNull();
		expect(unknown.payoffSavedUsd).toBeNull();
		expect(unknown.payoffDiscountPct).toBeNull();
		expect(g.payoffSavedUsd).toBeNull();
	});

	it('card metrics stay unknown when prices are unknown, cost basis never does', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map(),
			prices: LOADING_PRICES,
			nowMs: 0
		});
		const r = g.rows[0];
		expect(r.collateralValueUsd).toBeNull();
		expect(r.cyTokenRepayUsd).toBeNull();
		expect(r.pnlPct).toBeNull();
		expect(r.pricePct).toBeNull();
		expect(r.cyDiscountPct).toBeNull();
		expect(r.costBasisUsd).toBe(2n * ONE);
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
			payoffSavedUsd: null,
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

describe('ratio / formatPct', () => {
	it('ratio is null on unknowns and zero denominators', () => {
		expect(ratio(null, 1n)).toBeNull();
		expect(ratio(1n, null)).toBeNull();
		expect(ratio(1n, 0n)).toBeNull();
		expect(ratio(-5n, 10n)).toBeCloseTo(-0.5, 6);
	});
	it('formatPct signs and rounds to one decimal, dash on unknown', () => {
		expect(formatPct(null)).toBe('—');
		expect(formatPct(0.05)).toBe('+5.0%');
		expect(formatPct(-0.123)).toBe('−12.3%');
		expect(formatPct(0)).toBe('0.0%');
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

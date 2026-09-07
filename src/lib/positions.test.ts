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
	sortRows,
	nextSort,
	DEFAULT_SORT,
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
	closeValueUsd: null,
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
			nowMs: 3 * 86_400_000,
			cyTokenAtLock: new Map([[lockPrice.toString(), 68n * 10n ** 16n]]) // cyToken was $0.68 at mint
		});
		expect(g.count).toBe(1);
		expect(g.lockedUnderlying).toBe(100n * ONE);
		expect(g.mintedCyToken).toBe(minted);
		// NET TO CLOSE = collateral leg 100 × (0.04 − 0.02) = 2.00
		//              + cyToken leg   2 × (0.68 − 0.10)   = 1.16  → 3.16
		expect(g.netToCloseUsd).toBe(316n * 10n ** 16n);
		// close VALUE (not a gain): 100 × 0.04 − 2 × 0.10 = 3.8
		expect(g.rows[0].closeValueUsd).toBe(38n * 10n ** 17n);
		expect(g.rows[0].held).toBe(3);
		expect(g.rows[0].receipt.totalsFlr).toBe(100n * ONE);
		// 100 sFLR × $0.04 = $4 of collateral at today's oracle price
		expect(g.collateralValueUsd).toBe(4n * ONE);
		expect(g.hidden).toBe(false);
		// Cash to unlock all = every minted cyToken bought back at market: 2 × $0.10
		expect(g.cyTokenUsdNow).toBe(10n ** 17n);
		expect(g.cyTokenRepayUsd).toBe(2n * 10n ** 17n);

		const r = g.rows[0];
		expect(r.collateralValueUsd).toBe(4n * ONE); // A × Pnow
		expect(r.cyTokenRepayUsd).toBe(2n * 10n ** 17n); // 2 cysFLR × $0.10
		expect(r.costBasisUsd).toBe(2n * ONE); // M at $1 nominal = A × Plock
		expect(r.pnlPct).toBeCloseTo(1.58, 6); // 3.16 / 2.00 locked
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
		expect(g.netToCloseUsd).toBe(316n * 10n ** 16n);
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
		// no at-lock cyToken price ⇒ net to close is UNKNOWN, never a plausible number
		expect(known.netToCloseUsd).not.toBeNull();
		expect(unknown.netToCloseUsd).toBeNull();
		expect(unknown.pnlPct).toBeNull();
		expect(g.netToCloseUsd).toBeNull();
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

	it('REGRESSION: a position locked just now is $0 / 0% — the nominal discount never counts as money', () => {
		// Price unchanged since lock, cyToken worth the same now as at mint ($0.10):
		// nothing has moved, so closing yields exactly what you started with.
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map(),
			prices: { ...prices, underlyingUsdNow: lockPrice },
			nowMs: 0,
			cyTokenAtLock: new Map([[lockPrice.toString(), 10n ** 17n]])
		});
		expect(g.rows[0].netToCloseUsd).toBe(0n);
		expect(g.rows[0].pnlPct).toBe(0);
		expect(g.rows[0].cyDiscountPct).toBeCloseTo(0.9, 6); // the 90% discount exists, and is NOT a gain
		expect(g.rows[0].closeValueUsd).toBe(2n * ONE - 2n * 10n ** 17n); // close value still 1.8
	});

	it('the two legs move net to close independently: price flat, cyToken fell 0.68 → 0.10 = +$1.16', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map(),
			prices: { ...prices, underlyingUsdNow: lockPrice },
			nowMs: 0,
			cyTokenAtLock: new Map([[lockPrice.toString(), 68n * 10n ** 16n]])
		});
		expect(g.rows[0].netToCloseUsd).toBe(116n * 10n ** 16n);
		expect(g.rows[0].pnlPct).toBeCloseTo(0.58, 6); // 1.16 / 2.00 locked
		// price fell 0.02 → 0.015 (−$0.50 on 100) while the cyToken fell the same: 1.16 − 0.50 = +0.66
		const h = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map(),
			prices: { ...prices, underlyingUsdNow: 15n * 10n ** 15n },
			nowMs: 0,
			cyTokenAtLock: new Map([[lockPrice.toString(), 68n * 10n ** 16n]])
		});
		expect(h.rows[0].netToCloseUsd).toBe(66n * 10n ** 16n);
	});

	it('cash to unlock all is unknown while there is no cyToken market', () => {
		const g = buildTokenGroup({
			token,
			receipts: [receipt(lockPrice, minted)],
			lockDates: new Map(),
			prices: { ...prices, cyTokenUsdNow: null, settled: false },
			nowMs: 0
		});
		expect(g.cyTokenUsdNow).toBeNull();
		expect(g.cyTokenRepayUsd).toBeNull();
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

describe('sortRows / nextSort', () => {
	const rows = () => {
		const a = { ...row(50n, 3n * ONE), underlyingAmount: 10n, held: 5 };
		const b = { ...row(5n, 1n * ONE), underlyingAmount: 30n, held: null };
		const c = { ...row(null, 2n * ONE), underlyingAmount: 20n, held: 9 };
		return [a, b, c];
	};
	const nets = (r: PositionRow[]) => r.map((x) => x.netToCloseUsd);

	it('default order is best to close first, unknowns last', () => {
		expect(nets(sortRows(rows(), DEFAULT_SORT))).toEqual([50n, 5n, null]);
	});
	it('orders by locked amount both ways', () => {
		expect(sortRows(rows(), { key: 'locked', dir: 'desc' }).map((r) => r.underlyingAmount)).toEqual(
			[30n, 20n, 10n]
		);
		expect(sortRows(rows(), { key: 'locked', dir: 'asc' }).map((r) => r.underlyingAmount)).toEqual([
			10n,
			20n,
			30n
		]);
	});
	it('orders by lock price', () => {
		expect(sortRows(rows(), { key: 'lockPrice', dir: 'asc' }).map((r) => r.lockPriceUsd)).toEqual([
			ONE,
			2n * ONE,
			3n * ONE
		]);
		expect(sortRows(rows(), { key: 'lockPrice', dir: 'desc' }).map((r) => r.lockPriceUsd)).toEqual([
			3n * ONE,
			2n * ONE,
			ONE
		]);
	});
	it('orders by days held with unknown held at the bottom in BOTH directions', () => {
		expect(sortRows(rows(), { key: 'held', dir: 'desc' }).map((r) => r.held)).toEqual([9, 5, null]);
		expect(sortRows(rows(), { key: 'held', dir: 'asc' }).map((r) => r.held)).toEqual([5, 9, null]);
	});
	it('orders by net-to-close percent independently of dollars: a small position up more ranks first', () => {
		const big = { ...row(200n, ONE), pnlPct: 0.05 }; // +$200 on a big lock, +5%
		const small = { ...row(44n, ONE), pnlPct: 0.4 }; // +$44 on a small lock, +40%
		const unknown = { ...row(500n, ONE), pnlPct: null };
		expect(
			sortRows([big, small, unknown], { key: 'pct', dir: 'desc' }).map((r) => r.pnlPct)
		).toEqual([0.4, 0.05, null]);
		expect(
			sortRows([big, small, unknown], { key: 'pct', dir: 'asc' }).map((r) => r.pnlPct)
		).toEqual([0.05, 0.4, null]);
		expect(nextSort(DEFAULT_SORT, 'pct')).toEqual({ key: 'pct', dir: 'desc' });
	});
	it('unknown net-to-close stays at the bottom even ascending', () => {
		expect(nets(sortRows(rows(), { key: 'net', dir: 'asc' }))).toEqual([5n, 50n, null]);
	});
	it('does not mutate its input', () => {
		const input = rows();
		const before = nets(input);
		sortRows(input, { key: 'locked', dir: 'asc' });
		expect(nets(input)).toEqual(before);
	});
	it('nextSort flips the same column and starts a new column in its natural direction', () => {
		expect(nextSort(DEFAULT_SORT, 'net')).toEqual({ key: 'net', dir: 'asc' });
		expect(nextSort(DEFAULT_SORT, 'lockPrice')).toEqual({ key: 'lockPrice', dir: 'asc' });
		expect(nextSort(DEFAULT_SORT, 'held')).toEqual({ key: 'held', dir: 'desc' });
		expect(nextSort({ key: 'held', dir: 'desc' }, 'held')).toEqual({ key: 'held', dir: 'asc' });
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
			cyTokenUsdNow: null,
			cyTokenRepayUsd: null,
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

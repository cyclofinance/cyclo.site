/**
 * Grouping, ordering and formatting for the manager page. Pure — no stores,
 * no network. Everything numeric flows through `computePositionMetrics`, so the
 * P&L identity tested there holds here too.
 */
import { formatUnits } from 'viem';
import type { CyToken, Receipt } from '$lib/types';
import { computePositionMetrics, daysHeld, sumOrNull, ONE_18 } from '$lib/positionMath';
import type { LockDateMap } from '$lib/queries/getReceiptLockDates';

export type PositionRow = {
	receipt: Receipt;
	/** Locked collateral, raw in token decimals. */
	underlyingAmount: bigint;
	/** USD price of the collateral at lock, 18 dec (= tokenId). */
	lockPriceUsd: bigint;
	held: number | null;
	collateralPnlUsd: bigint | null;
	cyTokenPnlUsd: bigint | null;
	netToCloseUsd: bigint | null;
	/** Oracle price of the collateral now, 18 dec. Null = unknown. */
	underlyingUsdNow: bigint | null;
	/** Collateral value now = A × Pnow. Null = unknown. */
	collateralValueUsd: bigint | null;
	/** What the minted cyTokens cost to buy back now = M × Cnow. Null = no market. */
	cyTokenRepayUsd: bigint | null;
	/** Value at lock = A × Plock = M at $1 nominal. Always known. 18 dec. */
	costBasisUsd: bigint;
	/** Net to close as a fraction of cost basis (0.05 = +5%). Null = unknown. */
	pnlPct: number | null;
	/** Collateral price move since lock (0.10 = +10%). Null = unknown. */
	pricePct: number | null;
	/** How far below $1 the cyToken trades (0.9 = 90% below). Null = no market. */
	cyDiscountPct: number | null;
	/** cyToken market price now, 18 dec. Null = no market. */
	cyTokenUsdNow: bigint | null;
	/** cyToken market price when this position was locked, 18 dec. Null = unknown. */
	cyTokenUsdAtLock: bigint | null;
	/** What the payoff costs LESS today than at lock = M × (Clock − Cnow). Negative = costs more. Null = unknown. */
	payoffSavedUsd: bigint | null;
	/** Same, as a fraction of the at-lock payoff (0.6 = 60% cheaper). Null = unknown. */
	payoffDiscountPct: number | null;
};

export type TokenGroup = {
	token: CyToken;
	rows: PositionRow[];
	count: number;
	lockedUnderlying: bigint;
	mintedCyToken: bigint;
	/** USD value of all locked collateral at the oracle price now. Null = unknown. */
	collateralValueUsd: bigint | null;
	netToCloseUsd: bigint | null;
	/** Sum of payoffSavedUsd over the group. Null if any row is unknown. */
	payoffSavedUsd: bigint | null;
	/** cyToken market price now, 18 dec. Null = no market (or still probing). */
	cyTokenUsdNow: bigint | null;
	/**
	 * Cash to buy back EVERY cyToken this group minted at the market price now
	 * = M × Cnow over the group. What "unlock all" costs in dollars. Null = no market.
	 */
	cyTokenRepayUsd: bigint | null;
	/**
	 * True when we KNOW there is no market for the cyToken (price probe
	 * finished and found no pool). Hidden groups are not shown as positions
	 * and their token is not offered for minting.
	 */
	hidden: boolean;
};

export type TokenPrices = {
	/** Oracle price of the collateral now, 18 dec. Null = unreachable. */
	underlyingUsdNow: bigint | null;
	/** DEX price of one cyToken now, 18 dec. Null = no pool. */
	cyTokenUsdNow: bigint | null;
	/** False while the probes are still running. */
	settled: boolean;
};

export const LOADING_PRICES: TokenPrices = {
	underlyingUsdNow: null,
	cyTokenUsdNow: null,
	settled: false
};

/**
 * Best-to-close first: highest net-to-close on top, unknowns at the bottom,
 * ties broken by the lowest lock price (the oldest, cheapest positions).
 */
export const sortBestToCloseFirst = (rows: PositionRow[]): PositionRow[] =>
	[...rows].sort((a, b) => {
		if (a.netToCloseUsd === null && b.netToCloseUsd === null) {
			return a.lockPriceUsd < b.lockPriceUsd ? -1 : a.lockPriceUsd > b.lockPriceUsd ? 1 : 0;
		}
		if (a.netToCloseUsd === null) return 1;
		if (b.netToCloseUsd === null) return -1;
		if (a.netToCloseUsd !== b.netToCloseUsd) return a.netToCloseUsd > b.netToCloseUsd ? -1 : 1;
		return a.lockPriceUsd < b.lockPriceUsd ? -1 : a.lockPriceUsd > b.lockPriceUsd ? 1 : 0;
	});

export const buildTokenGroup = ({
	token,
	receipts,
	lockDates,
	prices,
	nowMs,
	cyTokenAtLock = new Map()
}: {
	token: CyToken;
	receipts: Receipt[];
	lockDates: LockDateMap;
	prices: TokenPrices;
	nowMs: number;
	/** tokenId -> cyToken USD price at that position's lock block (null = unknown). */
	cyTokenAtLock?: Map<string, bigint | null>;
}): TokenGroup => {
	const rows = receipts
		.filter((r) => r.balance > 0n && BigInt(r.tokenId) > 0n)
		.map((receipt): PositionRow => {
			const metrics = computePositionMetrics({
				balance: receipt.balance,
				tokenId: BigInt(receipt.tokenId),
				decimals: token.decimals,
				underlyingUsdNow: prices.underlyingUsdNow,
				cyTokenUsdNow: prices.cyTokenUsdNow
			});
			const scale = 10n ** BigInt(token.decimals);
			const costBasisUsd = (receipt.balance * ONE_18) / scale;
			const collateralValueUsd =
				prices.underlyingUsdNow === null
					? null
					: (metrics.underlyingAmount * prices.underlyingUsdNow) / scale;
			const cyTokenRepayUsd =
				prices.cyTokenUsdNow === null ? null : (receipt.balance * prices.cyTokenUsdNow) / scale;
			const cyTokenUsdAtLock = cyTokenAtLock.get(receipt.tokenId) ?? null;
			const payoffSavedUsd =
				cyTokenUsdAtLock === null || prices.cyTokenUsdNow === null
					? null
					: (receipt.balance * (cyTokenUsdAtLock - prices.cyTokenUsdNow)) / scale;
			return {
				receipt: { ...receipt, totalsFlr: metrics.underlyingAmount },
				underlyingAmount: metrics.underlyingAmount,
				lockPriceUsd: metrics.lockPriceUsd,
				held: daysHeld(lockDates.get(receipt.tokenId), nowMs),
				collateralPnlUsd: metrics.collateralPnlUsd,
				cyTokenPnlUsd: metrics.cyTokenPnlUsd,
				netToCloseUsd: metrics.netToCloseUsd,
				underlyingUsdNow: prices.underlyingUsdNow,
				collateralValueUsd,
				cyTokenRepayUsd,
				costBasisUsd,
				pnlPct: ratio(metrics.netToCloseUsd, costBasisUsd),
				pricePct:
					prices.underlyingUsdNow === null
						? null
						: ratio(prices.underlyingUsdNow - metrics.lockPriceUsd, metrics.lockPriceUsd),
				cyDiscountPct:
					prices.cyTokenUsdNow === null ? null : ratio(ONE_18 - prices.cyTokenUsdNow, ONE_18),
				cyTokenUsdNow: prices.cyTokenUsdNow,
				cyTokenUsdAtLock,
				payoffSavedUsd,
				payoffDiscountPct:
					cyTokenUsdAtLock === null || prices.cyTokenUsdNow === null
						? null
						: ratio(cyTokenUsdAtLock - prices.cyTokenUsdNow, cyTokenUsdAtLock)
			};
		});

	const sorted = sortBestToCloseFirst(rows);
	const lockedUnderlying = sorted.reduce((a, r) => a + r.underlyingAmount, 0n);
	return {
		token,
		rows: sorted,
		count: sorted.length,
		lockedUnderlying,
		mintedCyToken: sorted.reduce((a, r) => a + r.receipt.balance, 0n),
		collateralValueUsd:
			prices.underlyingUsdNow === null
				? null
				: (lockedUnderlying * prices.underlyingUsdNow) / 10n ** BigInt(token.decimals),
		netToCloseUsd: sumOrNull(sorted.map((r) => r.netToCloseUsd)),
		payoffSavedUsd: sumOrNull(sorted.map((r) => r.payoffSavedUsd)),
		cyTokenUsdNow: prices.cyTokenUsdNow,
		cyTokenRepayUsd: sumOrNull(sorted.map((r) => r.cyTokenRepayUsd)),
		hidden: prices.settled && prices.cyTokenUsdNow === null
	};
};

/** The columns a reader can order the rows by. */
export type SortKey = 'locked' | 'lockPrice' | 'held' | 'net' | 'pct';
export type SortDir = 'asc' | 'desc';
export type SortSpec = { key: SortKey; dir: SortDir };

/** The order the page opens in: best to close first. */
export const DEFAULT_SORT: SortSpec = { key: 'net', dir: 'desc' };

/** The direction a column starts in when first clicked — what a reader most likely wants. */
export const NATURAL_DIR: Record<SortKey, SortDir> = {
	locked: 'desc',
	lockPrice: 'asc',
	held: 'desc',
	net: 'desc',
	pct: 'desc'
};

/** Click the column you are already on and it flips; click another and it starts natural. */
export const nextSort = (current: SortSpec, key: SortKey): SortSpec =>
	current.key === key
		? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
		: { key, dir: NATURAL_DIR[key] };

const sortValue = (row: PositionRow, key: SortKey): bigint | null => {
	switch (key) {
		case 'locked':
			return row.underlyingAmount;
		case 'lockPrice':
			return row.lockPriceUsd;
		case 'held':
			return row.held === null ? null : BigInt(row.held);
		case 'net':
			return row.netToCloseUsd;
		case 'pct':
			// Net to close as a share of what was locked — a $44 win on $500 beats
			// a $200 win on $3,000. Six decimals is plenty to order by.
			return row.pnlPct === null ? null : BigInt(Math.round(row.pnlPct * 1_000_000));
	}
};

/**
 * Order rows by one column. Unknowns (`—`) always sink to the bottom whatever
 * the direction, and ties fall back to the lowest lock price so the order is
 * stable and never depends on fetch timing.
 */
export const sortRows = (rows: PositionRow[], spec: SortSpec): PositionRow[] =>
	[...rows].sort((a, b) => {
		const av = sortValue(a, spec.key);
		const bv = sortValue(b, spec.key);
		if (av === null && bv !== null) return 1;
		if (bv === null && av !== null) return -1;
		if (av !== null && bv !== null && av !== bv) {
			const less = av < bv ? -1 : 1;
			return spec.dir === 'asc' ? less : -less;
		}
		return a.lockPriceUsd < b.lockPriceUsd ? -1 : a.lockPriceUsd > b.lockPriceUsd ? 1 : 0;
	});

/** a / b as a JS number, null when either side is unknown or b is zero. */
export const ratio = (a: bigint | null, b: bigint | null): number | null => {
	if (a === null || b === null || b === 0n) return null;
	// 6 decimal places of precision is plenty for a percentage display.
	return Number((a * 1_000_000n) / b) / 1_000_000;
};

/** Signed percent, one decimal. Unknown renders as a dash. */
export const formatPct = (fraction: number | null): string => {
	if (fraction === null || !Number.isFinite(fraction)) return '—';
	const pct = fraction * 100;
	const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
	return `${sign}${Math.abs(pct).toFixed(1)}%`;
};

/** cyTokens still to acquire before EVERY position in the group can be unlocked. */
export const cyTokenShortfall = (mintedCyToken: bigint, walletBalance: bigint): bigint =>
	mintedCyToken > walletBalance ? mintedCyToken - walletBalance : 0n;

/** Groups the page shows: not hidden, and holding at least one position. */
export const visibleGroups = (groups: TokenGroup[]): TokenGroup[] =>
	groups.filter((g) => !g.hidden && g.count > 0);

/** The one hero number. Unknown if ANY visible group is unknown. */
export const heroNetToClose = (groups: TokenGroup[]): bigint | null => {
	const shown = visibleGroups(groups);
	if (shown.length === 0) return null;
	return sumOrNull(shown.map((g) => g.netToCloseUsd));
};

/** Signed USD, 2 decimals (4 under a dollar). Unknown renders as a dash. */
export const formatUsd = (value: bigint | null): string => {
	if (value === null) return '—';
	const n = Number(formatUnits(value, 18));
	const sign = n > 0 ? '+' : n < 0 ? '−' : '';
	const digits = n !== 0 && Math.abs(n) < 1 ? 4 : 2;
	return `${sign}$${Math.abs(n).toLocaleString('en-US', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	})}`;
};

/**
 * A balance, TRUNCATED (never rounded up — a balance must never read higher
 * than what is held). Two decimals, unless the amount would vanish, in which
 * case enough decimals to show it (up to 6).
 */
export const formatAmount = (raw: bigint, decimals: number, maxFrac = 2): string => {
	const negative = raw < 0n;
	const abs = negative ? -raw : raw;
	const scale = 10n ** BigInt(decimals);
	const whole = abs / scale;
	const fracRaw = (abs % scale).toString().padStart(decimals, '0');

	const sign = negative ? '−' : '';
	let frac = fracRaw.slice(0, maxFrac);
	if (whole === 0n && abs > 0n && !/[1-9]/.test(frac)) {
		const extended = fracRaw.slice(0, 6);
		if (!/[1-9]/.test(extended)) return `${sign}<0.000001`;
		frac = extended;
	}
	frac = frac.replace(/0+$/, '');
	return `${sign}${whole.toLocaleString('en-US')}${frac ? '.' + frac : ''}`;
};

/** Lock price in USD per unit of collateral, enough decimals to be meaningful. */
export const formatLockPrice = (lockPriceUsd: bigint): string => {
	const n = Number(formatUnits(lockPriceUsd, 18));
	if (n >= 100) return n.toFixed(2);
	if (n >= 1) return n.toFixed(4);
	return n.toFixed(6);
};

/**
 * Grouping, ordering and formatting for the manager page. Pure — no stores,
 * no network. Everything numeric flows through `computePositionMetrics`, so the
 * P&L identity tested there holds here too.
 */
import { formatUnits } from 'viem';
import type { CyToken, Receipt } from '$lib/types';
import { computePositionMetrics, daysHeld, sumOrNull } from '$lib/positionMath';
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
	nowMs
}: {
	token: CyToken;
	receipts: Receipt[];
	lockDates: LockDateMap;
	prices: TokenPrices;
	nowMs: number;
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
			return {
				receipt: { ...receipt, totalsFlr: metrics.underlyingAmount },
				underlyingAmount: metrics.underlyingAmount,
				lockPriceUsd: metrics.lockPriceUsd,
				held: daysHeld(lockDates.get(receipt.tokenId), nowMs),
				collateralPnlUsd: metrics.collateralPnlUsd,
				cyTokenPnlUsd: metrics.cyTokenPnlUsd,
				netToCloseUsd: metrics.netToCloseUsd
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
		hidden: prices.settled && prices.cyTokenUsdNow === null
	};
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

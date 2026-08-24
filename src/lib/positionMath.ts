/**
 * P&L arithmetic for a Cyclo lock position. Pure — no network, no stores.
 *
 * Units, all verified against live Flare state:
 *   tokenId            18-dec USD price of the locked asset at lock time. This is
 *                      the same quantity the vault's price oracle returns now, so
 *                      "then" and "now" are directly comparable.
 *   balance            cyToken amount, raw, in `decimals`.
 *   underlyingUsdNow   18-dec USD, from the vault's price oracle.
 *   cyTokenUsdNow      18-dec USD, from the DEX. Nullable: some cyTokens have no
 *                      live pool.
 *
 * A lock position is long the collateral and short the cyToken:
 *   collateral leg  = A x (Pnow - Plock)   how the locked asset moved
 *   cyToken leg     = M x (1 - Cnow)       the discount on what you must repay
 *   net to close    = A x Pnow - M x Cnow  what unlocking is worth today
 *
 * Because the vault mints M = A x Plock, the two legs sum exactly to net-to-close.
 * That identity is what makes showing both legs coherent rather than redundant.
 */

const ONE_18 = 10n ** 18n;

export type PositionInputs = {
	balance: bigint;
	tokenId: bigint;
	decimals: number;
	underlyingUsdNow: bigint | null;
	cyTokenUsdNow: bigint | null;
};

export type PositionMetrics = {
	underlyingAmount: bigint;
	lockPriceUsd: bigint;
	collateralPnlUsd: bigint | null;
	cyTokenPnlUsd: bigint | null;
	netToCloseUsd: bigint | null;
};

export const computePositionMetrics = ({
	balance,
	tokenId,
	decimals,
	underlyingUsdNow,
	cyTokenUsdNow
}: PositionInputs): PositionMetrics => {
	if (tokenId <= 0n) {
		return {
			underlyingAmount: 0n,
			lockPriceUsd: 0n,
			collateralPnlUsd: null,
			cyTokenPnlUsd: null,
			netToCloseUsd: null
		};
	}

	const scale = 10n ** BigInt(decimals);
	const underlyingAmount = (balance * ONE_18) / tokenId;

	const collateralPnlUsd =
		underlyingUsdNow === null ? null : (underlyingAmount * (underlyingUsdNow - tokenId)) / scale;

	const cyTokenPnlUsd =
		cyTokenUsdNow === null ? null : (balance * (ONE_18 - cyTokenUsdNow)) / scale;

	const netToCloseUsd =
		underlyingUsdNow === null || cyTokenUsdNow === null
			? null
			: (underlyingAmount * underlyingUsdNow) / scale - (balance * cyTokenUsdNow) / scale;

	return { underlyingAmount, lockPriceUsd: tokenId, collateralPnlUsd, cyTokenPnlUsd, netToCloseUsd };
};

/** Whole days between a lock timestamp (epoch ms) and now. Null if unknown. */
export const daysHeld = (lockedAtMs: number | undefined, nowMs: number): number | null => {
	if (lockedAtMs === undefined || Number.isNaN(lockedAtMs)) return null;
	if (lockedAtMs > nowMs) return 0;
	return Math.floor((nowMs - lockedAtMs) / 86_400_000);
};

/** Sum a column, treating unknown as unknown rather than as zero. */
export const sumOrNull = (values: (bigint | null)[]): bigint | null =>
	values.some((v) => v === null)
		? null
		: values.reduce((a: bigint, b) => a + (b as bigint), 0n as bigint);

export { ONE_18 };

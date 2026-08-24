import { describe, it, expect } from 'vitest';
import { computePositionMetrics, daysHeld, sumOrNull, ONE_18 } from './positionMath';

// Live Flare values captured 2026-08-21.
const SFLR_NOW = 13_955_969_173_365_373n; // $0.013955969173365373 from the vault oracle
const REAL_TOKEN_ID = 23_677_170_395_729_291n; // $0.023677170395729291 per sFLR at lock

describe('computePositionMetrics', () => {
	it('derives the underlying amount the receipt metadata itself asserts', () => {
		// The on-chain receipt for this tokenId reads: "1 of these receipts can be
		// burned alongside 1 cysFLR to redeem 42.234776507769376029 sFLR."
		const { underlyingAmount } = computePositionMetrics({
			balance: ONE_18,
			tokenId: REAL_TOKEN_ID,
			decimals: 18,
			underlyingUsdNow: SFLR_NOW,
			cyTokenUsdNow: null
		});
		expect(underlyingAmount).toBe(42_234_776_507_769_376_029n);
	});

	it('reports a loss on the collateral leg when the asset fell since lock', () => {
		const { collateralPnlUsd } = computePositionMetrics({
			balance: ONE_18,
			tokenId: REAL_TOKEN_ID,
			decimals: 18,
			underlyingUsdNow: SFLR_NOW,
			cyTokenUsdNow: null
		});
		// sFLR fell 0.023677 -> 0.013956, so this must be negative.
		expect(collateralPnlUsd).not.toBeNull();
		expect(collateralPnlUsd! < 0n).toBe(true);
		// 42.234776507769376029 sFLR x -0.009721201222363918 USD = -0.4105727610135945 USD.
		// Exact to the wei, and pins BigInt truncation toward zero (floor would end ...547).
		expect(collateralPnlUsd).toBe(-410_572_761_013_594_546n);
	});

	it('reports a gain on the cyToken leg when the cyToken trades below its $1 nominal', () => {
		const { cyTokenPnlUsd } = computePositionMetrics({
			balance: ONE_18,
			tokenId: REAL_TOKEN_ID,
			decimals: 18,
			underlyingUsdNow: SFLR_NOW,
			cyTokenUsdNow: 112_454_000_000_000_000n // $0.112454
		});
		// Repaying a $1 nominal claim for $0.112454 is a $0.887546 gain.
		expect(cyTokenPnlUsd).toBe(887_546_000_000_000_000n);
	});

	it('makes the two legs sum exactly to net-to-close', () => {
		const m = computePositionMetrics({
			balance: 521_218_555_117_294_133n,
			tokenId: 25_859_509_177_706_496n,
			decimals: 18,
			underlyingUsdNow: SFLR_NOW,
			cyTokenUsdNow: 112_454_000_000_000_000n
		});
		const legs = m.collateralPnlUsd! + m.cyTokenPnlUsd!;
		// Integer division can cost a wei or two; the identity must hold to that.
		const drift = legs - m.netToCloseUsd!;
		expect(drift < 5n && drift > -5n).toBe(true);
	});

	it('handles 6-decimal cyTokens without losing the decimal scale', () => {
		const m = computePositionMetrics({
			balance: 1_000_000n, // 1 cyFXRP.ftso
			tokenId: 1_414_744_000_000_000_000n, // $1.414744 per FXRP
			decimals: 6,
			underlyingUsdNow: 1_414_744_000_000_000_000n,
			cyTokenUsdNow: 237_350_000_000_000_000n
		});
		// Price unchanged since lock => collateral leg is flat.
		expect(m.collateralPnlUsd).toBe(0n);
		expect(m.cyTokenPnlUsd).toBe(762_650_000_000_000_000n);
	});

	it('returns nulls rather than zeros when a price is unavailable', () => {
		const m = computePositionMetrics({
			balance: ONE_18,
			tokenId: REAL_TOKEN_ID,
			decimals: 18,
			underlyingUsdNow: null,
			cyTokenUsdNow: null
		});
		expect(m.collateralPnlUsd).toBeNull();
		expect(m.cyTokenPnlUsd).toBeNull();
		expect(m.netToCloseUsd).toBeNull();
	});

	it('does not divide by a zero tokenId', () => {
		const m = computePositionMetrics({
			balance: ONE_18,
			tokenId: 0n,
			decimals: 18,
			underlyingUsdNow: SFLR_NOW,
			cyTokenUsdNow: ONE_18
		});
		expect(m.underlyingAmount).toBe(0n);
		expect(m.netToCloseUsd).toBeNull();
	});
});

describe('daysHeld', () => {
	const now = Date.parse('2026-08-21T00:00:00Z');
	it('floors to whole days', () => {
		expect(daysHeld(Date.parse('2026-08-11T12:00:00Z'), now)).toBe(9);
	});
	it('returns null when the lock date is unknown', () => {
		expect(daysHeld(undefined, now)).toBeNull();
	});
	it('clamps a future timestamp to zero instead of going negative', () => {
		expect(daysHeld(Date.parse('2026-09-01T00:00:00Z'), now)).toBe(0);
	});
});

describe('sumOrNull', () => {
	it('sums when every value is known', () => {
		expect(sumOrNull([1n, 2n, 3n])).toBe(6n);
	});
	it('refuses to treat an unknown as zero', () => {
		expect(sumOrNull([1n, null, 3n])).toBeNull();
	});
});

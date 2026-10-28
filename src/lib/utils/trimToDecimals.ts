/**
 * Truncate a non-negative decimal string to a fixed number of fractional
 * places without an intermediate `Number` round-trip.
 *
 * `formatUnits` returns a full-precision decimal string. Passing it through
 * `Number(...).toFixed(places)` casts to an IEEE-754 double first, which only
 * holds ~15-17 significant digits, so the displayed figure can be wrong in its
 * lowest digits once the value exceeds ~2^53. Truncating the string directly
 * keeps every displayed digit exact. Missing fractional digits are padded with
 * zeros so the output always has exactly `places` decimals.
 */
export const trimToDecimals = (
  decimalString: string,
  places: number,
): string => {
  const [whole, frac = ""] = decimalString.split(".");
  return `${whole}.${(frac + "0".repeat(places)).slice(0, places)}`;
};

/**
 * Returns `value` unchanged when it is a native `bigint`, otherwise `0n`.
 *
 * Subgraph-derived objects are only typed as carrying `bigint` fields;
 * nothing enforces that shape at runtime, so schema drift can surface
 * strings or missing fields. Routing every such access through this guard
 * keeps `formatUnits`/`formatEther` from receiving non-bigint values and
 * lets the UI fall back to a zero display instead of crashing the render.
 */
export function safeBigInt(value: unknown): bigint {
  return typeof value === "bigint" ? value : 0n;
}

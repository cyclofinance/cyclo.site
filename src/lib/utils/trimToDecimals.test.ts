import { describe, it, expect } from "vitest";
import { formatUnits } from "viem";
import { trimToDecimals } from "./trimToDecimals";

describe("trimToDecimals", () => {
  it("truncates (does not round) the fractional part to the requested places", () => {
    // .toFixed(5) would round this up to 123.45679; truncation must not.
    expect(trimToDecimals("123.456789", 5)).toBe("123.45678");
  });

  it("pads a short fractional part with trailing zeros", () => {
    expect(trimToDecimals("1.5", 5)).toBe("1.50000");
  });

  it("pads an integer-only string to the requested places", () => {
    expect(trimToDecimals("1", 5)).toBe("1.00000");
  });

  it("keeps a zero value at zero", () => {
    expect(trimToDecimals("0", 5)).toBe("0.00000");
  });

  it("preserves full precision for values beyond Number's safe range", () => {
    // 10^36 / 3, formatted at 18 decimals, is far larger than 2^53, so the
    // old `Number(formatUnits(...)).toFixed(5)` path corrupts the low digits.
    const value = formatUnits(BigInt(10) ** BigInt(36) / 3n, 18);
    expect(value).toBe("333333333333333333.333333333333333333");

    // The string-truncation path keeps every displayed digit exact.
    expect(trimToDecimals(value, 5)).toBe("333333333333333333.33333");

    // The IEEE-754 round-trip the fix removes produces a different (wrong)
    // figure, proving the fix is load-bearing rather than cosmetic.
    expect(Number(value).toFixed(5)).not.toBe("333333333333333333.33333");
  });
});

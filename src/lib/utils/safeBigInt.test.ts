import { describe, it, expect } from "vitest";
import { safeBigInt } from "./safeBigInt";

describe("safeBigInt", () => {
  it("returns bigint values unchanged", () => {
    expect(safeBigInt(123n)).toBe(123n);
    expect(safeBigInt(0n)).toBe(0n);
    expect(safeBigInt(-5n)).toBe(-5n);
  });

  it("returns 0n for any non-bigint value", () => {
    expect(safeBigInt(undefined)).toBe(0n);
    expect(safeBigInt(null)).toBe(0n);
    expect(safeBigInt("123000000000000000000")).toBe(0n);
    expect(safeBigInt(123)).toBe(0n);
    expect(safeBigInt({})).toBe(0n);
    expect(safeBigInt([])).toBe(0n);
    expect(safeBigInt(true)).toBe(0n);
  });
});

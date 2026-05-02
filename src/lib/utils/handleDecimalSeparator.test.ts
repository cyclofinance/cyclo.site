import { describe, it, expect } from "vitest";
import { handleDecimalSeparator } from "./handleDecimalSeparator";

describe("handleDecimalSeparator", () => {
  const createInputEvent = (value: string) => ({
    target: { value },
  });

  it("should handle basic decimal input with dot", () => {
    const event = createInputEvent("123.45");
    expect(handleDecimalSeparator(event)).toBe("123.45");
  });

  it("should convert comma to dot", () => {
    const event = createInputEvent("123,45");
    expect(handleDecimalSeparator(event)).toBe("123.45");
  });

  it("should remove multiple commas", () => {
    const event = createInputEvent("123,45,67");
    expect(handleDecimalSeparator(event)).toBe("123.4567");
  });

  it("should handle mixed separators", () => {
    const event = createInputEvent("123.45,67");
    expect(handleDecimalSeparator(event)).toBe("123.4567");
  });

  it("should remove non-numeric characters", () => {
    const event = createInputEvent("abc123.45xyz");
    expect(handleDecimalSeparator(event)).toBe("123.45");
  });

  it("should handle empty input", () => {
    const event = createInputEvent("");
    expect(handleDecimalSeparator(event)).toBe("");
  });

  it("should handle input with only separators", () => {
    const event = createInputEvent(".,");
    expect(handleDecimalSeparator(event)).toBe(".");
  });

  it("should preserve leading zeros", () => {
    const event = createInputEvent("0.123");
    expect(handleDecimalSeparator(event)).toBe("0.123");
  });

  it("should handle multiple leading zeros", () => {
    const event = createInputEvent("00.123");
    expect(handleDecimalSeparator(event)).toBe("00.123");
  });
});

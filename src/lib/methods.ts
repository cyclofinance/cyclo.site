export function readableNumber(number: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };
  const formattedWithOptions = number.toLocaleString("en-US", options);
  return formattedWithOptions;
}

export const formatNumberWithAbbreviations = (num: number) => {
  if (num < 1000) return num.toString(); // less than a thousand
  const si = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "B" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" },
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let i;
  for (i = si.length - 1; i > 0; i--) {
    if (num >= si[i].value) {
      break;
    }
  }
  return (num / si[i].value).toFixed(2).replace(rx, "$1") + si[i].symbol;
};

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe("readableNumber", () => {
    it("should format numbers with up to 2 decimal places", () => {
      expect(readableNumber(1234.567)).toBe("1,234.57");
      expect(readableNumber(1234)).toBe("1,234");
      expect(readableNumber(1234.5)).toBe("1,234.5");
    });

    it("should handle very small and very large numbers", () => {
      expect(readableNumber(0.0001)).toBe("0");
      expect(readableNumber(1234567890.123)).toBe("1,234,567,890.12");
    });
  });

  describe("formatNumberWithAbbreviations", () => {
    it("should format numbers with abbreviations correctly", () => {
      expect(formatNumberWithAbbreviations(999)).toBe("999");
      expect(formatNumberWithAbbreviations(1000)).toBe("1k");
      expect(formatNumberWithAbbreviations(1500)).toBe("1.5k");
      expect(formatNumberWithAbbreviations(1000000)).toBe("1M");
      expect(formatNumberWithAbbreviations(2500000)).toBe("2.5M");
      expect(formatNumberWithAbbreviations(1000000000)).toBe("1B");
      expect(formatNumberWithAbbreviations(1234567890)).toBe("1.23B");
    });

    it("should handle edge cases", () => {
      expect(formatNumberWithAbbreviations(1000000000000)).toBe("1T");
      expect(formatNumberWithAbbreviations(1000000000000000)).toBe("1P");
    });
  });
}

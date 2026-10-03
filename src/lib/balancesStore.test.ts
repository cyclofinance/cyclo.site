import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
  type MockInstance,
} from "vitest";
import { get } from "svelte/store";
import {
  readErc20BalanceOf,
  simulateQuoterQuoteExactInputSingle,
  simulateQuoterQuoteExactOutputSingle,
  simulateErc20PriceOracleReceiptVaultPreviewDeposit,
  readErc20TotalSupply,
} from "../generated";
import balancesStore, {
  scaleDecimals,
  MAX_PRICE_DEVIATION_BPS,
  MAX_PRICE_REFERENCE_AGE_MS,
} from "./balancesStore";
import {
  getBlock,
  simulateContract,
  readContract,
  type Config,
} from "@wagmi/core";
import type { Hex } from "viem";
import type { CyToken } from "$lib/types";
import { supportedNetworks } from "./stores";

const { mockWagmiConfigStore } = await vi.hoisted(
  () => import("./mocks/mockStores"),
);

vi.mock("../generated", () => ({
  readErc20BalanceOf: vi.fn(),
  simulateQuoterQuoteExactInputSingle: vi.fn(),
  simulateQuoterQuoteExactOutputSingle: vi.fn(),
  simulateErc20PriceOracleReceiptVaultPreviewDeposit: vi.fn(),
  readErc20TotalSupply: vi.fn(),
}));

vi.mock("@wagmi/core", () => ({
  getBlock: vi.fn(),
  simulateContract: vi.fn(),
  readContract: vi.fn(),
}));

describe("balancesStore", () => {
  const mockSignerAddress = "0x1234567890abcdef";

  const {
    reset,
    refreshBalances,
    refreshPrices,
    refreshDepositPreviewSwapValue,
    refreshFooterStats,
  } = balancesStore;

  const buildInitialState = () => {
    const stats: Record<
      string,
      {
        supply: bigint;
        price: bigint;
        priceUpdatedAt: number;
        lockPrice: bigint;
        underlyingTvl: bigint;
        usdTvl: bigint;
      }
    > = {};

    const balances: Record<
      string,
      {
        signerBalance: bigint;
        signerUnderlyingBalance: bigint;
      }
    > = {};

    const allTokens = supportedNetworks.flatMap((network) => network.tokens);
    allTokens.forEach((token) => {
      stats[token.name] = {
        supply: BigInt(0),
        price: BigInt(0),
        priceUpdatedAt: 0,
        lockPrice: BigInt(0),
        underlyingTvl: BigInt(0),
        usdTvl: BigInt(0),
      };
      balances[token.name] = {
        signerBalance: BigInt(0),
        signerUnderlyingBalance: BigInt(0),
      };
    });

    return {
      balances,
      stats,
      statsLoading: true,
      status: "Checking",
      swapQuotes: {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
    reset();
  });

  it("should initialize with the correct default state", () => {
    expect(get(balancesStore)).toEqual(buildInitialState());
  });
  it("should refresh cysFLR balances correctly", async () => {
    (getBlock as Mock).mockResolvedValue({ number: BigInt(1000) });
    const mocksFlrBalance = BigInt(1000);
    (readErc20BalanceOf as Mock).mockResolvedValue(mocksFlrBalance);

    await refreshBalances(
      mockWagmiConfigStore as unknown as Config,
      mockSignerAddress,
    );

    const storeValue = get(balancesStore);
    expect(storeValue.balances.cysFLR.signerBalance).toBe(mocksFlrBalance);
    expect(storeValue.balances.cysFLR.signerUnderlyingBalance).toBe(
      mocksFlrBalance,
    );
    expect(storeValue.status).toBe("Ready");
  });

  it("should refresh cyWETH Balance correctly", async () => {
    const mockCyWETHBalance = BigInt(2000);
    (readErc20BalanceOf as Mock).mockResolvedValue(mockCyWETHBalance);

    await refreshBalances(
      mockWagmiConfigStore as unknown as Config,
      mockSignerAddress,
    );

    const storeValue = get(balancesStore);
    expect(storeValue.balances.cyWETH.signerBalance).toBe(mockCyWETHBalance);
    expect(storeValue.balances.cyWETH.signerUnderlyingBalance).toBe(
      mockCyWETHBalance,
    );
    expect(storeValue.status).toBe("Ready");
  });

  it("should refresh prices correctly", async () => {
    const mockCysFlrUsdPriceReturn = { result: [BigInt(2000)] };
    (
      simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
    ).mockResolvedValue({
      result: BigInt(1000),
    });
    (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue(
      mockCysFlrUsdPriceReturn,
    );
    (readErc20BalanceOf as Mock).mockResolvedValue(BigInt(3e18));
    (readErc20TotalSupply as Mock).mockResolvedValue(BigInt(1000));

    const mockToken: CyToken = {
      name: "cysFLR",
      address: "0xcdef1234abcdef5678",
      underlyingAddress: "0xabcd1234",
      underlyingSymbol: "sFLR",
      underlyingDecimals: 18,
      receiptAddress: "0xeeff5678",
      symbol: "cysFLR",
      decimals: 18,
      chainId: 14,
      networkName: "Flare",
      active: true,
    };

    await refreshPrices(mockWagmiConfigStore as unknown as Config, mockToken);

    const storeValue = get(balancesStore);
    expect(storeValue.stats.cysFLR.lockPrice).toBe(BigInt(1000n));
    expect(storeValue.stats.cysFLR.supply).toBe(BigInt(1000n));
    expect(storeValue.stats.cysFLR.underlyingTvl).toBe(BigInt(3e18));
    expect(storeValue.stats.cysFLR.usdTvl).toBe(
      (BigInt(3e18) * BigInt(1000n)) / BigInt(1e18),
    );
    expect(storeValue.status).toBe("Ready");
  });

  it("should reset the store to its initial state", () => {
    const mockWFlrBalance = BigInt(1000);
    (readErc20BalanceOf as Mock).mockResolvedValue(mockWFlrBalance);
    refreshBalances(
      mockWagmiConfigStore as unknown as Config,
      mockSignerAddress,
    );

    reset();

    expect(get(balancesStore)).toEqual(buildInitialState());
  });

  describe("refreshDepositPreviewSwapValue returns the quoter output as-is", () => {
    const config = mockWagmiConfigStore as unknown as Config;
    const valueToken = "0x1111111111111111111111111111111111111111" as Hex;
    const depositAmount = BigInt(1e18);
    // 1000 cyTokens (18 decimals) minted; cUSDX quotes are 6-decimal. Market
    // price is anywhere in (0, $1], so quotes far below mint parity (and, for
    // completeness, above it) are displayed, never suppressed.
    const depositPreview = 1000n * 10n ** 18n;
    const nearParityQuote = 900n * 10n ** 6n;
    const deepDiscountQuote = 100n * 10n ** 6n;
    const aboveParityQuote = 2000n * 10n ** 6n;

    const flareToken: CyToken = {
      name: "cysFLR",
      symbol: "cysFLR",
      decimals: 18,
      address: "0xcdef1234abcdef5678" as Hex,
      underlyingAddress: "0xabcd1234" as Hex,
      underlyingSymbol: "sFLR",
      underlyingDecimals: 18,
      receiptAddress: "0xeeff5678" as Hex,
      chainId: 14,
      networkName: "Flare",
      active: true,
    };

    const arbitrumToken: CyToken = {
      ...flareToken,
      name: "cyWETH.pyth",
      symbol: "cyWETH.pyth",
      chainId: 42161,
      networkName: "Arbitrum One",
    };

    let warnSpy: MockInstance;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      (
        simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
      ).mockResolvedValue({ result: depositPreview });
    });

    it("passes a near-parity Flare quote through unchanged", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [nearParityQuote],
      });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      const { swapQuotes } = get(balancesStore);
      expect(swapQuotes.cusdxOutput).toBe(nearParityQuote);
      expect(swapQuotes.cyTokenOutput).toBe(depositPreview);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("passes a Flare quote deep below mint parity through unchanged", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [deepDiscountQuote],
      });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      const { swapQuotes } = get(balancesStore);
      expect(swapQuotes.cusdxOutput).toBe(deepDiscountQuote);
      expect(swapQuotes.cyTokenOutput).toBe(depositPreview);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("passes a Flare quote above mint parity through unchanged", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [aboveParityQuote],
      });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(aboveParityQuote);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("returns a zero quote as-is", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [0n],
      });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(0n);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("passes a deep-discount quote from the fee-10000 fallback through unchanged", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock)
        .mockRejectedValueOnce(new Error("no fee-3000 pool"))
        .mockResolvedValue({ result: [deepDiscountQuote] });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      expect(simulateQuoterQuoteExactInputSingle).toHaveBeenCalledTimes(2);
      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(deepDiscountQuote);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("passes a deep-discount Algebra quote on Arbitrum through unchanged", async () => {
      (simulateContract as Mock).mockResolvedValue({
        result: [deepDiscountQuote, 3000n],
      });

      await refreshDepositPreviewSwapValue(
        config,
        arbitrumToken,
        valueToken,
        depositAmount,
      );

      expect(simulateQuoterQuoteExactInputSingle).not.toHaveBeenCalled();
      const { swapQuotes } = get(balancesStore);
      expect(swapQuotes.cusdxOutput).toBe(deepDiscountQuote);
      expect(swapQuotes.cyTokenOutput).toBe(depositPreview);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("scaleDecimals", () => {
    it("scales down when the source has more decimals", () => {
      expect(scaleDecimals(1000n * 10n ** 18n, 18, 6)).toBe(1000n * 10n ** 6n);
    });

    it("scales up when the source has fewer decimals", () => {
      expect(scaleDecimals(1000n * 10n ** 4n, 4, 6)).toBe(1000n * 10n ** 6n);
    });

    it("is the identity at equal decimals", () => {
      expect(scaleDecimals(123_456n, 6, 6)).toBe(123_456n);
    });
  });

  describe("refreshFooterStats price sanity bound (getCyTokenUsdPrice)", () => {
    const config = mockWagmiConfigStore as unknown as Config;
    const t0 = 1_700_000_000_000;
    const tick = 10_000; // src/routes/+layout.svelte refresh interval
    const firstPrice = 800_000n; // 0.80 in 6-decimal cUSDX terms
    // Band edges computed from the spec: 20% of 0.80 is 0.16.
    const upperBoundPrice = 960_000n;
    const lowerBoundPrice = 640_000n;
    const abovePrice = 1_000_000n; // +25%
    const belowPrice = 600_000n; // -25%

    let warnSpy: MockInstance;

    const flareQuoter = () => {
      (simulateContract as Mock).mockRejectedValue(
        new Error("no algebra in test"),
      );
      return simulateQuoterQuoteExactOutputSingle as Mock;
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(t0);
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});
      (readErc20TotalSupply as Mock).mockResolvedValue(0n);
      (readErc20BalanceOf as Mock).mockResolvedValue(0n);
      (
        simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
      ).mockResolvedValue({ result: 0n });
      // Arbitrum lock price reads fall back to previewDeposit.
      (readContract as Mock).mockRejectedValue(new Error("no pyth in test"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("sizes the band to a 10s tick and the reference age to a throttled tab", () => {
      expect(MAX_PRICE_DEVIATION_BPS).toBe(2000n);
      expect(MAX_PRICE_REFERENCE_AGE_MS).toBe(60_000);
    });

    it("accepts the first Flare price and stamps when it was observed", async () => {
      flareQuoter().mockResolvedValue({ result: [firstPrice] });

      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(firstPrice);
      expect(get(balancesStore).stats.cysFLR.priceUpdatedAt).toBe(t0);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("suppresses a Flare price more than 20% above the previous tick", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      vi.setSystemTime(t0 + tick);
      quoter.mockResolvedValue({ result: [abovePrice] });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("suppresses a Flare price more than 20% below the previous tick", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      vi.setSystemTime(t0 + tick);
      quoter.mockResolvedValue({ result: [belowPrice] });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("accepts prices exactly at the 20% band edges", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      vi.setSystemTime(t0 + tick);
      quoter.mockResolvedValue({ result: [upperBoundPrice] });
      await refreshFooterStats(config);
      expect(get(balancesStore).stats.cysFLR.price).toBe(upperBoundPrice);

      quoter.mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);
      vi.setSystemTime(t0 + 2 * tick);
      quoter.mockResolvedValue({ result: [lowerBoundPrice] });
      await refreshFooterStats(config);
      expect(get(balancesStore).stats.cysFLR.price).toBe(lowerBoundPrice);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("accepts a price after a suppression because the reference is gone", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      vi.setSystemTime(t0 + tick);
      quoter.mockResolvedValue({ result: [abovePrice] });
      await refreshFooterStats(config);
      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockClear();
      vi.setSystemTime(t0 + 2 * tick);
      await refreshFooterStats(config);
      expect(get(balancesStore).stats.cysFLR.price).toBe(abovePrice);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("skips the bound when the reference is older than the max age", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      vi.setSystemTime(t0 + MAX_PRICE_REFERENCE_AGE_MS + 1);
      quoter.mockResolvedValue({ result: [abovePrice] });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(abovePrice);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("still bounds against a reference exactly at the max age", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      vi.setSystemTime(t0 + MAX_PRICE_REFERENCE_AGE_MS);
      quoter.mockResolvedValue({ result: [abovePrice] });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("re-stamps the reference on every accepted price", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      // Accepted at t0 + 50s: the reference must now be dated here, so at
      // t0 + 100s it is 50s old (still bounding), not 100s old (skipped).
      vi.setSystemTime(t0 + 50_000);
      await refreshFooterStats(config);
      expect(get(balancesStore).stats.cysFLR.priceUpdatedAt).toBe(t0 + 50_000);

      vi.setSystemTime(t0 + 100_000);
      quoter.mockResolvedValue({ result: [abovePrice] });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("bounds the fee-10000 fallback price against the previous tick", async () => {
      const quoter = flareQuoter().mockResolvedValue({ result: [firstPrice] });
      await refreshFooterStats(config);

      // cysFLR is the first token queried: its fee-3000 attempt rejects so
      // its price flows through the fee-10000 fallback path.
      vi.setSystemTime(t0 + tick);
      quoter
        .mockReset()
        .mockRejectedValueOnce(new Error("no fee-3000 pool"))
        .mockResolvedValue({ result: [abovePrice] });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("bounds the Arbitrum Algebra price against the previous tick", async () => {
      (simulateQuoterQuoteExactOutputSingle as Mock).mockRejectedValue(
        new Error("no flare quoter in test"),
      );
      (simulateContract as Mock).mockResolvedValue({
        result: [firstPrice, 3000n],
      });
      await refreshFooterStats(config);
      expect(get(balancesStore).stats["cyWETH.pyth"].price).toBe(firstPrice);

      vi.setSystemTime(t0 + tick);
      (simulateContract as Mock).mockResolvedValue({
        result: [abovePrice, 3000n],
      });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats["cyWETH.pyth"].price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});

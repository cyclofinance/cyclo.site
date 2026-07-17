import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
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
import balancesStore from "./balancesStore";
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

  describe("refreshDepositPreviewSwapValue quoter sanity bounds", () => {
    const config = mockWagmiConfigStore as unknown as Config;
    const valueToken = "0x1111111111111111111111111111111111111111" as Hex;
    const depositAmount = BigInt(1e18);
    // 1000 cyTokens (18 decimals), minted at USD parity, so the parity
    // reference in 6-decimal cUSDX terms is 1000e6. The 50% deviation band
    // around it is [500e6, 1500e6].
    const depositPreview = 1000n * 10n ** 18n;
    const inBoundsQuote = 900n * 10n ** 6n;
    const upperBoundQuote = 1500n * 10n ** 6n;
    const lowerBoundQuote = 500n * 10n ** 6n;
    const aboveBandQuote = 2000n * 10n ** 6n;
    const belowBandQuote = 400n * 10n ** 6n;

    const flareToken: CyToken = {
      name: "cysFLR",
      symbol: "cysFLR",
      decimals: 18,
      address: "0xcdef1234abcdef5678" as Hex,
      underlyingAddress: "0xabcd1234" as Hex,
      underlyingSymbol: "sFLR",
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

    it("passes an in-bounds Flare quote through unchanged", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [inBoundsQuote],
      });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      const { swapQuotes } = get(balancesStore);
      expect(swapQuotes.cusdxOutput).toBe(inBoundsQuote);
      expect(swapQuotes.cyTokenOutput).toBe(depositPreview);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("accepts quotes exactly at the deviation bounds", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [upperBoundQuote],
      });
      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );
      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(upperBoundQuote);

      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [lowerBoundQuote],
      });
      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );
      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(lowerBoundQuote);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("suppresses a Flare quote above the deviation band", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [aboveBandQuote],
      });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      const { swapQuotes } = get(balancesStore);
      expect(swapQuotes.cusdxOutput).toBe(0n);
      expect(swapQuotes.cyTokenOutput).toBe(depositPreview);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("suppresses a nonzero Flare quote below the deviation band", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [belowBandQuote],
      });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("returns a zero quote as-is without flagging it as out-of-bounds", async () => {
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

    it("suppresses an out-of-band quote from the fee-10000 fallback", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock)
        .mockRejectedValueOnce(new Error("no fee-3000 pool"))
        .mockResolvedValue({ result: [aboveBandQuote] });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("passes an in-bounds quote from the fee-10000 fallback through unchanged", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock)
        .mockRejectedValueOnce(new Error("no fee-3000 pool"))
        .mockResolvedValue({ result: [inBoundsQuote] });

      await refreshDepositPreviewSwapValue(
        config,
        flareToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(inBoundsQuote);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("suppresses an out-of-band Algebra quote on Arbitrum", async () => {
      (simulateContract as Mock).mockResolvedValue({
        result: [aboveBandQuote, 3000n],
      });

      await refreshDepositPreviewSwapValue(
        config,
        arbitrumToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("passes an in-bounds Algebra quote on Arbitrum through unchanged", async () => {
      (simulateContract as Mock).mockResolvedValue({
        result: [inBoundsQuote, 3000n],
      });

      await refreshDepositPreviewSwapValue(
        config,
        arbitrumToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(inBoundsQuote);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("scales the parity reference up for tokens with fewer decimals than the value token", async () => {
      const fourDecimalsToken: CyToken = { ...flareToken, decimals: 4 };
      // 1000 cyTokens in 4 decimals; parity reference is still 1000e6 once
      // scaled up to the 6-decimal value token.
      (
        simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
      ).mockResolvedValue({ result: 1000n * 10n ** 4n });
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [inBoundsQuote],
      });

      await refreshDepositPreviewSwapValue(
        config,
        fourDecimalsToken,
        valueToken,
        depositAmount,
      );

      expect(get(balancesStore).swapQuotes.cusdxOutput).toBe(inBoundsQuote);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("refreshFooterStats quoter sanity bounds (getCyTokenUsdPrice)", () => {
    const config = mockWagmiConfigStore as unknown as Config;
    const firstPrice = 800_000n; // 0.80 in 6-decimal cUSDX terms
    const inBoundsPrice = 900_000n; // within 50% of firstPrice
    const outOfBandPrice = 8_000_000n; // 10x firstPrice

    let warnSpy: MockInstance;

    beforeEach(() => {
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

    it("accepts the first Flare price when there is no previous price to bound against", async () => {
      (simulateContract as Mock).mockRejectedValue(
        new Error("no algebra in test"),
      );
      (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue({
        result: [firstPrice],
      });

      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(firstPrice);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("suppresses a Flare price that deviates too far from the previous price", async () => {
      (simulateContract as Mock).mockRejectedValue(
        new Error("no algebra in test"),
      );
      (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue({
        result: [firstPrice],
      });
      await refreshFooterStats(config);

      (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue({
        result: [outOfBandPrice],
      });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("passes an in-bounds Flare price through on subsequent refreshes", async () => {
      (simulateContract as Mock).mockRejectedValue(
        new Error("no algebra in test"),
      );
      (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue({
        result: [firstPrice],
      });
      await refreshFooterStats(config);

      (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue({
        result: [inBoundsPrice],
      });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(inBoundsPrice);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("bounds the fee-10000 fallback price against the previous price", async () => {
      (simulateContract as Mock).mockRejectedValue(
        new Error("no algebra in test"),
      );
      (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue({
        result: [firstPrice],
      });
      await refreshFooterStats(config);

      // cysFLR is the first token queried: its fee-3000 attempt rejects so
      // its price flows through the fee-10000 fallback path.
      (simulateQuoterQuoteExactOutputSingle as Mock)
        .mockReset()
        .mockRejectedValueOnce(new Error("no fee-3000 pool"))
        .mockResolvedValue({ result: [outOfBandPrice] });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats.cysFLR.price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("bounds the Arbitrum Algebra price against the previous price", async () => {
      (simulateQuoterQuoteExactOutputSingle as Mock).mockRejectedValue(
        new Error("no flare quoter in test"),
      );
      (simulateContract as Mock).mockResolvedValue({
        result: [firstPrice, 3000n],
      });
      await refreshFooterStats(config);
      expect(get(balancesStore).stats["cyWETH.pyth"].price).toBe(firstPrice);

      (simulateContract as Mock).mockResolvedValue({
        result: [outOfBandPrice, 3000n],
      });
      await refreshFooterStats(config);

      expect(get(balancesStore).stats["cyWETH.pyth"].price).toBe(0n);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});

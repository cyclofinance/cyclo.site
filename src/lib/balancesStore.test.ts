import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { get } from "svelte/store";
import {
  readErc20BalanceOf,
  simulateQuoterQuoteExactOutputSingle,
  simulateErc20PriceOracleReceiptVaultPreviewDeposit,
  readErc20TotalSupply,
  simulateQuoterQuoteExactInputSingle,
} from "../generated";
import balancesStore from "./balancesStore";
import type { Config } from "@wagmi/core";
import type { CyToken } from "$lib/types";
import { supportedNetworks } from "./stores";

const { mockWagmiConfigStore } = await vi.hoisted(
  () => import("./mocks/mockStores"),
);

vi.mock("../generated", () => ({
  readErc20BalanceOf: vi.fn(),
  simulateQuoterQuoteExactOutputSingle: vi.fn(),
  simulateErc20PriceOracleReceiptVaultPreviewDeposit: vi.fn(),
  readErc20TotalSupply: vi.fn(),
  simulateQuoterQuoteExactInputSingle: vi.fn(),
}));

vi.mock("@wagmi/core", () => ({
  readContract: vi.fn(),
  simulateContract: vi.fn(),
}));

describe("balancesStore", () => {
  const mockSignerAddress = "0x1234567890abcdef";

  const { reset, refreshBalances, refreshPrices } = balancesStore;

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

  describe("reads at the latest block and surfaces failures as null", () => {
    const config = mockWagmiConfigStore as unknown as Config;
    const token: CyToken = {
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

    beforeEach(() => {
      (
        simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
      ).mockResolvedValue({ result: BigInt(1000) });
      (readErc20TotalSupply as Mock).mockResolvedValue(BigInt(1000));
      (readErc20BalanceOf as Mock).mockResolvedValue(BigInt(3e18));
      (simulateQuoterQuoteExactInputSingle as Mock).mockResolvedValue({
        result: [BigInt(7)],
      });
    });

    it("refreshPrices reads TVL without a block number", async () => {
      await refreshPrices(config, token);

      expect(readErc20BalanceOf).toHaveBeenCalledTimes(1);
      expect((readErc20BalanceOf as Mock).mock.calls[0][1]).not.toHaveProperty(
        "blockNumber",
      );
    });

    it("refreshPrices stores a failed TVL read as null", async () => {
      (readErc20BalanceOf as Mock).mockRejectedValue(
        new Error("missing trie node"),
      );

      await refreshPrices(config, token);

      const stats = get(balancesStore).stats.cysFLR;
      expect(stats.underlyingTvl).toBeNull();
      expect(stats.usdTvl).toBeNull();
      expect(stats.lockPrice).toBe(BigInt(1000));
      expect(stats.supply).toBe(BigInt(1000));
    });

    it("refreshPrices stores failed lock price and supply reads as null", async () => {
      (
        simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
      ).mockRejectedValue(new Error("rpc"));
      (readErc20TotalSupply as Mock).mockRejectedValue(new Error("rpc"));

      await refreshPrices(config, token);

      const stats = get(balancesStore).stats.cysFLR;
      expect(stats.lockPrice).toBeNull();
      expect(stats.supply).toBeNull();
      expect(stats.underlyingTvl).toBe(BigInt(3e18));
      expect(stats.usdTvl).toBeNull();
    });

    it("refreshDepositPreviewSwapValue previews without a block number", async () => {
      await balancesStore.refreshDepositPreviewSwapValue(
        config,
        token,
        "0xusdc",
        BigInt(10),
      );

      expect(
        simulateErc20PriceOracleReceiptVaultPreviewDeposit,
      ).toHaveBeenCalledTimes(1);
      expect(
        (simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock).mock
          .calls[0][1],
      ).not.toHaveProperty("blockNumber");
      expect(get(balancesStore).swapQuotes).toEqual({
        cyTokenOutput: BigInt(1000),
        cusdxOutput: BigInt(7),
      });
    });

    it("refreshDepositPreviewSwapValue stores a failed preview as null", async () => {
      (
        simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
      ).mockRejectedValue(new Error("missing trie node"));

      await balancesStore.refreshDepositPreviewSwapValue(
        config,
        token,
        "0xusdc",
        BigInt(10),
      );

      expect(get(balancesStore).swapQuotes).toEqual({
        cyTokenOutput: null,
        cusdxOutput: null,
      });
    });

    it("refreshDepositPreviewSwapValue stores a failed swap quote as null", async () => {
      (simulateQuoterQuoteExactInputSingle as Mock).mockRejectedValue(
        new Error("rpc"),
      );

      await balancesStore.refreshDepositPreviewSwapValue(
        config,
        token,
        "0xusdc",
        BigInt(10),
      );

      expect(get(balancesStore).swapQuotes).toEqual({
        cyTokenOutput: BigInt(1000),
        cusdxOutput: null,
      });
    });

    it("refreshFooterStats stores failed reads as null for every token", async () => {
      (readErc20BalanceOf as Mock).mockRejectedValue(new Error("rpc"));
      (readErc20TotalSupply as Mock).mockRejectedValue(new Error("rpc"));
      (simulateQuoterQuoteExactOutputSingle as Mock).mockRejectedValue(
        new Error("rpc"),
      );

      await balancesStore.refreshFooterStats(config);

      const { stats } = get(balancesStore);
      for (const t of supportedNetworks.flatMap((n) => n.tokens)) {
        expect(stats[t.name].underlyingTvl).toBeNull();
        expect(stats[t.name].usdTvl).toBeNull();
        expect(stats[t.name].supply).toBeNull();
        expect(stats[t.name].price).toBeNull();
      }
    });
  });
});

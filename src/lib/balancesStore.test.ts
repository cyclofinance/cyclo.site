import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { get } from "svelte/store";
import {
  readErc20BalanceOf,
  simulateQuoterQuoteExactOutputSingle,
  simulateErc20PriceOracleReceiptVaultPreviewDeposit,
  readErc20TotalSupply,
} from "../generated";
import balancesStore from "./balancesStore";
import {
  getBlock,
  readContract,
  simulateContract,
  type Config,
} from "@wagmi/core";
import { arbitrum } from "@wagmi/core/chains";
import { zeroAddress } from "viem";
import type { CyToken } from "$lib/types";
import { supportedNetworks } from "./stores";
import { STALE_PERIOD } from "./constants";
import { I_PYTH_ABI, PYTH_ORACLE_ABI } from "./pyth";

const { mockWagmiConfigStore } = await vi.hoisted(
  () => import("./mocks/mockStores"),
);

vi.mock("../generated", () => ({
  readErc20BalanceOf: vi.fn(),
  simulateQuoterQuoteExactOutputSingle: vi.fn(),
  simulateErc20PriceOracleReceiptVaultPreviewDeposit: vi.fn(),
  readErc20TotalSupply: vi.fn(),
}));

vi.mock("@wagmi/core", () => ({
  getBlock: vi.fn(),
  readContract: vi.fn(),
  simulateContract: vi.fn(),
}));

describe("balancesStore", () => {
  const mockSignerAddress = "0x1234567890abcdef";

  const { reset, refreshBalances, refreshPrices, refreshFooterStats } =
    balancesStore;

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

  describe("refreshFooterStats on Arbitrum (Pyth lock price)", () => {
    const PRICE_ORACLE = "0x0000000000000000000000000000000000000a01";
    const PYTH = "0x0000000000000000000000000000000000000a02";
    const FEED_ID = `0x${"ab".repeat(32)}`;
    const FALLBACK_LOCK_PRICE = 777n;
    const TVL = 2n * 10n ** 18n;
    const arbitrumToken = supportedNetworks.find(
      (network) => network.chain.id === arbitrum.id,
    )!.tokens[0];

    const mockPyth = (price: bigint, expo: bigint) => {
      (readContract as Mock).mockImplementation(
        async (_config: Config, { functionName }: { functionName: string }) => {
          switch (functionName) {
            case "priceOracle":
              return PRICE_ORACLE;
            case "I_PYTH_CONTRACT":
              return PYTH;
            case "I_PRICE_FEED_ID":
              return FEED_ID;
            case "getPriceNoOlderThan":
              return { price, conf: 0n, expo, publishTime: 0n };
            default:
              throw new Error(`unexpected readContract ${functionName}`);
          }
        },
      );
      (
        simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
      ).mockResolvedValue({ result: FALLBACK_LOCK_PRICE });
      (simulateContract as Mock).mockResolvedValue({ result: [0n, 0n] });
      (simulateQuoterQuoteExactOutputSingle as Mock).mockResolvedValue({
        result: [0n],
      });
      (readErc20BalanceOf as Mock).mockResolvedValue(TVL);
      (readErc20TotalSupply as Mock).mockResolvedValue(1000n);
    };

    const lockPriceAfterRefresh = async () => {
      await refreshFooterStats(mockWagmiConfigStore as unknown as Config);
      return get(balancesStore).stats[arbitrumToken.name];
    };

    const expectFallback = (stats: { lockPrice: bigint; usdTvl: bigint }) => {
      expect(
        simulateErc20PriceOracleReceiptVaultPreviewDeposit,
      ).toHaveBeenCalledWith(mockWagmiConfigStore, {
        address: arbitrumToken.address,
        args: [BigInt(1e18), 0n],
        account: zeroAddress,
        chainId: arbitrum.id,
      });
      expect(stats.lockPrice).toBe(FALLBACK_LOCK_PRICE);
      expect(stats.usdTvl).toBe((TVL * FALLBACK_LOCK_PRICE) / BigInt(1e18));
    };

    it("falls back to previewDeposit when Pyth returns a negative price", async () => {
      mockPyth(-5n, -8n);
      expectFallback(await lockPriceAfterRefresh());
    });

    it("falls back to previewDeposit when Pyth returns a zero price", async () => {
      mockPyth(0n, -8n);
      expectFallback(await lockPriceAfterRefresh());
    });

    it("reads the feed through the vault's oracle and scales expo -8 by 10^10", async () => {
      mockPyth(123456789n, -8n);
      const stats = await lockPriceAfterRefresh();
      expect(readContract).toHaveBeenCalledWith(mockWagmiConfigStore, {
        abi: PYTH_ORACLE_ABI,
        address: PRICE_ORACLE,
        functionName: "I_PYTH_CONTRACT",
        args: [],
        chainId: arbitrum.id,
      });
      expect(readContract).toHaveBeenCalledWith(mockWagmiConfigStore, {
        abi: I_PYTH_ABI,
        address: PYTH,
        functionName: "getPriceNoOlderThan",
        args: [FEED_ID, STALE_PERIOD],
        chainId: arbitrum.id,
      });
      expect(
        simulateErc20PriceOracleReceiptVaultPreviewDeposit,
      ).not.toHaveBeenCalledWith(
        mockWagmiConfigStore,
        expect.objectContaining({ address: arbitrumToken.address }),
      );
      expect(stats.lockPrice).toBe(1234567890000000000n);
    });

    it("scales expo 0 by exactly 10^18", async () => {
      mockPyth(123456789n, 0n);
      expect((await lockPriceAfterRefresh()).lockPrice).toBe(
        123456789000000000000000000n,
      );
    });

    it("scales expo 5 by exactly 10^23", async () => {
      mockPyth(123456789n, 5n);
      expect((await lockPriceAfterRefresh()).lockPrice).toBe(
        12345678900000000000000000000000n,
      );
    });

    it("divides by exactly 10^23 at expo -41", async () => {
      mockPyth(10n ** 46n, -41n);
      expect((await lockPriceAfterRefresh()).lockPrice).toBe(10n ** 23n);
    });
  });
});

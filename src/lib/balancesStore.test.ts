import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { get } from "svelte/store";
import {
  readErc20BalanceOf,
  simulateQuoterQuoteExactOutputSingle,
  simulateErc20PriceOracleReceiptVaultPreviewDeposit,
  readErc20TotalSupply,
} from "../generated";
import balancesStore from "./balancesStore";
import { getBlock, readContract, type Config } from "@wagmi/core";
import {
  AbiErrorSignatureNotFoundError,
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  parseAbi,
  type Hex,
} from "viem";
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
}));

vi.mock("@wagmi/core", () => ({
  getBlock: vi.fn(),
  readContract: vi.fn(),
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

  it("marks an Arbitrum lock price stale only on a Pyth StalePrice revert", async () => {
    const allTokens = supportedNetworks.flatMap((network) => network.tokens);
    const cyArb = allTokens.find((token) => token.name === "cyARB.pyth")!;
    const cyWeth = allTokens.find((token) => token.name === "cyWETH.pyth")!;
    const otherRevertSelector = "0x14aebe68";

    // Every non-price read echoes its address, so the feed id is the vault.
    (readContract as Mock).mockImplementation(
      async (
        _config,
        {
          functionName,
          address,
          args,
        }: { functionName: string; address: Hex; args: Hex[] },
      ) => {
        if (functionName !== "getPriceNoOlderThan") return address;
        const data =
          args[0] === cyArb.address ? "0x19abf40e" : otherRevertSelector;
        throw new ContractFunctionExecutionError(
          new ContractFunctionRevertedError({
            abi: [],
            data,
            functionName,
          }),
          { abi: [], functionName, contractAddress: address },
        );
      },
    );
    (
      simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
    ).mockResolvedValue({ result: BigInt(5) });
    (readErc20BalanceOf as Mock).mockResolvedValue(BigInt(2e18));

    await refreshFooterStats(mockWagmiConfigStore as unknown as Config);

    const { stats } = get(balancesStore);
    expect(stats[cyArb.name].lockPrice).toBe(0n);
    expect(stats[cyArb.name].lockPriceStale).toBe(true);
    expect(stats[cyWeth.name].lockPrice).toBe(5n);
    expect(stats[cyWeth.name].lockPriceStale).toBe(false);
    expect(stats[cyArb.name].usdTvl).toBe(0n);
    expect(stats[cyWeth.name].usdTvl).toBe(10n);
    expect(
      simulateErc20PriceOracleReceiptVaultPreviewDeposit,
    ).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ address: cyArb.address }),
    );
  });

  const allTokens = supportedNetworks.flatMap((network) => network.tokens);
  const tokenNamed = (name: string) =>
    allTokens.find((token) => token.name === name)!;

  const mockPythPriceRead = (priceRead: () => Promise<unknown>) =>
    (readContract as Mock).mockImplementation(
      async (_config, { functionName, address }) =>
        functionName === "getPriceNoOlderThan" ? priceRead() : address,
    );

  it("marks a lock price stale on a StalePrice revert decoded from the ABI", async () => {
    mockPythPriceRead(async () => {
      throw new ContractFunctionExecutionError(
        new ContractFunctionRevertedError({
          abi: parseAbi(["error StalePrice()"]),
          data: "0x19abf40e",
          functionName: "getPriceNoOlderThan",
        }),
        { abi: [], functionName: "getPriceNoOlderThan" },
      );
    });
    (readErc20BalanceOf as Mock).mockResolvedValue(0n);

    await refreshFooterStats(mockWagmiConfigStore as unknown as Config);

    const { stats } = get(balancesStore);
    expect(stats["cyARB.pyth"].lockPrice).toBe(0n);
    expect(stats["cyARB.pyth"].lockPriceStale).toBe(true);
  });

  it("does not mark a lock price stale for a non-revert error carrying the StalePrice selector", async () => {
    mockPythPriceRead(async () => {
      throw new BaseError("decode failed", {
        cause: new AbiErrorSignatureNotFoundError("0x19abf40e", {
          docsPath: "",
        }),
      });
    });
    (
      simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
    ).mockResolvedValue({ result: BigInt(5) });
    (readErc20BalanceOf as Mock).mockResolvedValue(0n);

    await refreshFooterStats(mockWagmiConfigStore as unknown as Config);

    const { stats } = get(balancesStore);
    expect(stats["cyARB.pyth"].lockPrice).toBe(5n);
    expect(stats["cyARB.pyth"].lockPriceStale).toBe(false);
  });

  it("reports fresh Pyth, non-Arbitrum and failed lock prices as not stale", async () => {
    // 123456789 * 10^-8 USD normalised to 18 decimals.
    mockPythPriceRead(async () => ({
      price: 123456789n,
      conf: 0n,
      expo: -8n,
      publishTime: 0n,
    }));
    const cysFlr = tokenNamed("cysFLR");
    (
      simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
    ).mockImplementation(async (_config, { address }: { address: Hex }) => {
      if (address === cysFlr.address) return { result: BigInt(7) };
      throw new Error("preview failed");
    });
    (readErc20BalanceOf as Mock).mockResolvedValue(0n);

    await refreshFooterStats(mockWagmiConfigStore as unknown as Config);

    const { stats } = get(balancesStore);
    expect(stats["cyARB.pyth"].lockPrice).toBe(1234567890000000000n);
    expect(stats["cyARB.pyth"].lockPriceStale).toBe(false);
    expect(stats["cysFLR"].lockPrice).toBe(7n);
    expect(stats["cysFLR"].lockPriceStale).toBe(false);
    expect(stats["cyWETH"].lockPrice).toBe(0n);
    expect(stats["cyWETH"].lockPriceStale).toBe(false);
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

  const stalePriceRevert = () =>
    new ContractFunctionExecutionError(
      new ContractFunctionRevertedError({
        abi: parseAbi(["error StalePrice()"]),
        data: "0x19abf40e",
        functionName: "getPriceNoOlderThan",
      }),
      { abi: [], functionName: "getPriceNoOlderThan" },
    );

  it("marks the selected Arbitrum token stale in refreshPrices on a StalePrice revert", async () => {
    mockPythPriceRead(async () => {
      throw stalePriceRevert();
    });
    (
      simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
    ).mockResolvedValue({ result: 0n });

    (readErc20BalanceOf as Mock).mockResolvedValue(0n);

    await refreshPrices(
      mockWagmiConfigStore as unknown as Config,
      tokenNamed("cyARB.pyth"),
    );

    expect(get(balancesStore).stats["cyARB.pyth"].lockPriceStale).toBe(true);
  });

  it("reports a fresh selected Arbitrum token as not stale in refreshPrices", async () => {
    mockPythPriceRead(async () => ({
      price: 123456789n,
      conf: 0n,
      expo: -8n,
      publishTime: 0n,
    }));
    (
      simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
    ).mockResolvedValue({ result: 5n });

    (readErc20BalanceOf as Mock).mockResolvedValue(0n);

    await refreshPrices(
      mockWagmiConfigStore as unknown as Config,
      tokenNamed("cyARB.pyth"),
    );

    const { stats } = get(balancesStore);
    expect(stats["cyARB.pyth"].lockPriceStale).toBe(false);
    expect(stats["cyARB.pyth"].lockPrice).toBe(5n);
  });

  it("reports the selected token as not stale in refreshPrices when the price reads all fail", async () => {
    mockPythPriceRead(async () => {
      throw new Error("rpc down");
    });
    (
      simulateErc20PriceOracleReceiptVaultPreviewDeposit as Mock
    ).mockRejectedValue(new Error("preview failed"));

    (readErc20BalanceOf as Mock).mockResolvedValue(0n);

    await refreshPrices(
      mockWagmiConfigStore as unknown as Config,
      tokenNamed("cyARB.pyth"),
    );

    const { stats } = get(balancesStore);
    expect(stats["cyARB.pyth"].lockPriceStale).toBe(false);
    expect(stats["cyARB.pyth"].lockPrice).toBe(0n);
  });
});

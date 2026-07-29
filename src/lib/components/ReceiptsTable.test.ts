import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import ReceiptsTable from "./ReceiptsTable.svelte";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockReceipt } from "$lib/mocks/mockReceipt";
import type { CyToken, Receipt } from "$lib/types";
import type { Hex } from "viem";
import { formatEther } from "ethers";

const { mockBalancesWritable } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable } = require("svelte/store");
  return {
    mockBalancesWritable: writable({
      status: "Ready",
      statsLoading: false,
      stats: {} as Record<
        string,
        {
          supply: bigint;
          price: bigint;
          lockPrice: bigint;
          underlyingTvl: bigint;
          usdTvl: bigint;
        }
      >,
      balances: {},
      swapQuotes: { cyTokenOutput: 0n, cusdxOutput: 0n },
    }),
  };
});

vi.mock("$lib/balancesStore", () => ({
  default: {
    subscribe: mockBalancesWritable.subscribe,
    reset: vi.fn(),
    refreshBalances: vi.fn(),
    refreshPrices: vi.fn(),
    refreshDepositPreviewSwapValue: vi.fn(),
    refreshFooterStats: vi.fn(),
  },
}));

const noStats = () =>
  mockBalancesWritable.set({
    status: "Ready",
    statsLoading: false,
    stats: {},
    balances: {},
    swapQuotes: { cyTokenOutput: 0n, cusdxOutput: 0n },
  });

/**
 * Publish `lockPrice` (18 decimals) as the CURRENT lock price for `tokenName`,
 * i.e. the price a fresh lock would mint at right now. This is the only input
 * to the re-up columns that is not already on the receipt itself.
 */
const setLockPrice = (tokenName: string, lockPrice: bigint) =>
  mockBalancesWritable.set({
    status: "Ready",
    statsLoading: false,
    stats: {
      [tokenName]: {
        supply: 0n,
        price: 0n,
        lockPrice,
        underlyingTvl: 0n,
        usdTvl: 0n,
      },
    },
    balances: {},
    swapQuotes: { cyTokenOutput: 0n, cusdxOutput: 0n },
  });

/**
 * A receipt minted at `tokenId` (the lock price at mint time, always 18
 * decimals) currently holding `balance` cyToken (in the cyToken's decimals).
 */
const receiptAt = (tokenId: bigint, balance: bigint): Receipt => ({
  chainId: "14",
  tokenAddress: "0x6D6111ab02800aC64f66456874add77F44529a90" as Hex,
  tokenId: tokenId.toString(),
  balance,
  token: "cysFLR",
});

const cell = (testId: string) =>
  screen.getByTestId(testId).textContent?.trim() ?? "";

const mockReceipts = [mockReceipt, mockReceipt];

const cysFLR: CyToken = {
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

const cyWETH: CyToken = {
  ...cysFLR,
  name: "cyWETH",
  symbol: "cyWETH",
  underlyingSymbol: "WETH",
};

// Mirrors the production cyFXRP.ftso entry in src/lib/stores.ts: a live
// cyToken whose decimals are 6, not 18.
const cyFXRP: CyToken = {
  ...cysFLR,
  name: "cyFXRP.ftso",
  symbol: "cyFXRP.ftso",
  decimals: 6,
  underlyingSymbol: "FXRP",
  underlyingDecimals: 6,
};

describe("ReceiptsTable Component", () => {
  const selectedToken = cysFLR;

  beforeEach(() => {
    noStats();
  });

  it("renders the receipts table with correct headers and data", async () => {
    render(ReceiptsTable, {
      receipts: mockReceipts as unknown as Receipt[],
      token: selectedToken,
    });

    expect(screen.getByTestId("headers")).toBeInTheDocument();

    for (let i = 0; i < mockReceipts.length; i++) {
      expect(screen.getByTestId(`locked-price-${i}`)).toHaveTextContent(
        Number(formatEther(mockReceipts[i].tokenId)).toFixed(5),
      );
      expect(screen.getByTestId(`number-held-${i}`)).toHaveTextContent(
        Number(formatEther(mockReceipts[i].balance)).toFixed(5),
      );
      expect(screen.getByTestId(`total-locked-${i}`)).toHaveTextContent(
        Number(mockReceipts[i].readableTotalsFlr).toFixed(5),
      );
    }
  });

  it("opens a receipt modal when redeem button is clicked", async () => {
    render(ReceiptsTable, {
      receipts: mockReceipts as unknown as Receipt[],
      token: selectedToken,
    });

    const redeemButton = screen.getByTestId("redeem-button-0");
    await fireEvent.click(redeemButton);

    await waitFor(() => {
      expect(screen.getByTestId("receipt-modal")).toBeInTheDocument();
    });
  });
});

// Expected values below are derived by hand from the worked example and the
// requirement in issue #237, not from running the component:
//
//   addl cyToken per 1 underlying = max(0, currentLockPrice - mintLockPrice)
//   underlying locked by a receipt = balance / mintLockPrice
//   addl cyToken for a receipt     = underlying locked * addl per 1 underlying
//   grand total                    = sum of addl cyToken over the receipts
//
// where mintLockPrice is `receipt.tokenId` (18 decimals, per getReceipts.ts)
// and balances/re-up totals are in the cyToken's own decimals.
describe("ReceiptsTable re-up math (issue #237)", () => {
  beforeEach(() => {
    noStats();
  });

  it("reproduces the issue #237 worked example: 1 WETH locked at 3000, price now 4000, so 1000 additional cyWETH", async () => {
    // Locked 1 WETH when the lock price was 3000 -> 3000 cyWETH minted.
    setLockPrice("cyWETH", 4000n * 10n ** 18n);

    render(ReceiptsTable, {
      receipts: [receiptAt(3000n * 10n ** 18n, 3000n * 10n ** 18n)],
      token: cyWETH,
    });

    // 3000 cyWETH / 3000 per WETH = 1 WETH locked.
    expect(cell("total-locked-0")).toBe("1.00000");
    // 4000 mintable now - 3000 burned to unlock = 1000 additional per WETH.
    expect(cell("reup-per-1-0")).toBe("1000.00000");
    // 1 WETH * 1000 = the "additional 1000 cyWETH" the issue describes.
    expect(cell("reup-total-0")).toBe("1000.00000");
    expect(cell("reup-total-sum")).toBe("1000.00000 cyWETH");
    // The cell's tooltip shows the two prices the figure came from.
    expect(screen.getByTestId("reup-per-1-0").getAttribute("title")).toContain(
      "current: 4000.00000, original: 3000.00000",
    );
  });

  it("clamps re-up to zero when the current lock price is below or equal to the mint price", async () => {
    setLockPrice("cyWETH", 2000n * 10n ** 18n);

    render(ReceiptsTable, {
      receipts: [
        // Minted at 3000, price has since fallen to 2000: nothing to re-up.
        receiptAt(3000n * 10n ** 18n, 3000n * 10n ** 18n),
        // Minted at exactly the current price: still nothing to re-up.
        receiptAt(2000n * 10n ** 18n, 2000n * 10n ** 18n),
      ],
      token: cyWETH,
    });

    expect(cell("reup-per-1-0")).toBe("0.00000");
    expect(cell("reup-total-0")).toBe("0.00000");
    expect(cell("reup-per-1-1")).toBe("0.00000");
    expect(cell("reup-total-1")).toBe("0.00000");
    expect(cell("reup-total-sum")).toBe("0.00000 cyWETH");
  });

  it("sums re-up across receipts, contributing zero for an underwater receipt", async () => {
    setLockPrice("cysFLR", 5n * 10n ** 18n);

    render(ReceiptsTable, {
      receipts: [
        // 4 cysFLR minted at 2 -> 2 sFLR locked, addl 3/sFLR -> 6 cysFLR.
        receiptAt(2n * 10n ** 18n, 4n * 10n ** 18n),
        // 4 cysFLR minted at 4 -> 1 sFLR locked, addl 1/sFLR -> 1 cysFLR.
        receiptAt(4n * 10n ** 18n, 4n * 10n ** 18n),
        // 8 cysFLR minted at 8 -> 1 sFLR locked, underwater -> 0 cysFLR.
        receiptAt(8n * 10n ** 18n, 8n * 10n ** 18n),
      ],
      token: cysFLR,
    });

    expect(cell("total-locked-0")).toBe("2.00000");
    expect(cell("reup-per-1-0")).toBe("3.00000");
    expect(cell("reup-total-0")).toBe("6.00000");

    expect(cell("total-locked-1")).toBe("1.00000");
    expect(cell("reup-per-1-1")).toBe("1.00000");
    expect(cell("reup-total-1")).toBe("1.00000");

    expect(cell("total-locked-2")).toBe("1.00000");
    expect(cell("reup-per-1-2")).toBe("0.00000");
    expect(cell("reup-total-2")).toBe("0.00000");

    // 6 + 1 + 0, never 6 + 1 - 3.
    expect(cell("reup-total-sum")).toBe("7.00000 cysFLR");
  });

  it("renders re-up in the cyToken's own decimals for the 6-decimal cyFXRP.ftso, keeping a fractional price delta", async () => {
    // 5.5 FXRP-per-cyFXRP lock price, expressed in 18 decimals like every
    // other lock price, against a cyToken that has only 6 decimals.
    setLockPrice("cyFXRP.ftso", 5_500_000_000_000_000_000n);

    render(ReceiptsTable, {
      // 6 cyFXRP (6 decimals) minted at a lock price of 3 -> 2 FXRP locked.
      receipts: [receiptAt(3n * 10n ** 18n, 6_000_000n)],
      token: cyFXRP,
    });

    expect(cell("number-held-0")).toBe("6.00000");
    expect(cell("total-locked-0")).toBe("2.00000");
    // 5.5 - 3 = 2.5 additional cyFXRP per FXRP: a fractional delta must not
    // be floored to 2 before it is applied.
    expect(cell("reup-per-1-0")).toBe("2.50000");
    // 2 FXRP * 2.5 = 5 cyFXRP, rendered in 6 decimals.
    expect(cell("reup-total-0")).toBe("5.00000");
    expect(cell("reup-total-sum")).toBe("5.00000 cyFXRP.ftso");
  });

  it("keeps whale-scale re-up exact past Number.MAX_SAFE_INTEGER wei", async () => {
    setLockPrice("cysFLR", 5n * 10n ** 18n);

    render(ReceiptsTable, {
      // 1,000,000 cysFLR minted at 2 -> 500,000 sFLR locked.
      receipts: [receiptAt(2n * 10n ** 18n, 1_000_000n * 10n ** 18n)],
      token: cysFLR,
    });

    expect(cell("total-locked-0")).toBe("500000.00000");
    expect(cell("reup-per-1-0")).toBe("3.00000");
    // 500,000 * 3 = 1,500,000 cysFLR, i.e. 1.5e24 wei.
    expect(cell("reup-total-0")).toBe("1500000.00000");
    expect(cell("reup-total-sum")).toBe("1500000.00000 cysFLR");
  });

  it("shows sub-1e-5 re-up dust as zero and still carries it into the grand total", async () => {
    // Current lock price 1.000004.
    setLockPrice("cysFLR", 1_000_004_000_000_000_000n);

    render(ReceiptsTable, {
      receipts: [
        // 1 cysFLR minted at 1 -> 1 sFLR locked, addl 0.000004/sFLR.
        receiptAt(10n ** 18n, 10n ** 18n),
        // 1 cysFLR minted at 0.5 -> 2 sFLR locked, addl 0.500004/sFLR.
        receiptAt(5n * 10n ** 17n, 10n ** 18n),
      ],
      token: cysFLR,
    });

    expect(cell("total-locked-0")).toBe("1.00000");
    expect(cell("reup-per-1-0")).toBe("0.00000");
    expect(cell("reup-total-0")).toBe("0.00000");

    expect(cell("total-locked-1")).toBe("2.00000");
    expect(cell("reup-per-1-1")).toBe("0.50000");
    // 2 * 0.500004 = 1.000008, which displays rounded up at the 5th decimal.
    expect(cell("reup-total-1")).toBe("1.00001");

    // 0.000004 + 1.000008 = 1.000008000004 -> 1.00001.
    expect(cell("reup-total-sum")).toBe("1.00001 cysFLR");
  });

  it("recomputes re-up when the lock price refreshes", async () => {
    setLockPrice("cysFLR", 3n * 10n ** 18n);

    render(ReceiptsTable, {
      // 2 cysFLR minted at 2 -> 1 sFLR locked.
      receipts: [receiptAt(2n * 10n ** 18n, 2n * 10n ** 18n)],
      token: cysFLR,
    });

    expect(cell("reup-per-1-0")).toBe("1.00000");
    expect(cell("reup-total-0")).toBe("1.00000");
    expect(cell("reup-total-sum")).toBe("1.00000 cysFLR");

    setLockPrice("cysFLR", 6n * 10n ** 18n);

    await waitFor(() => {
      expect(cell("reup-per-1-0")).toBe("4.00000");
    });
    expect(cell("reup-total-0")).toBe("4.00000");
    expect(cell("reup-total-sum")).toBe("4.00000 cysFLR");
  });

  it("shows zero re-up when no lock price has loaded for the token yet", async () => {
    // stats is empty: nothing is known about the current lock price. The
    // receipt was minted at 0.001, low enough that any non-zero stand-in for
    // the unknown price would surface as a non-zero re-up here.
    render(ReceiptsTable, {
      receipts: [receiptAt(10n ** 15n, 10n ** 18n)],
      token: cysFLR,
    });

    expect(cell("total-locked-0")).toBe("1000.00000");
    expect(cell("reup-per-1-0")).toBe("0.00000");
    expect(cell("reup-total-0")).toBe("0.00000");
    expect(cell("reup-total-sum")).toBe("0.00000 cysFLR");
    // An unknown price is treated as zero, not as some placeholder price.
    expect(screen.getByTestId("reup-per-1-0").getAttribute("title")).toContain(
      "current: 0.00000, original: 0.00100",
    );
  });

  it("shows zero re-up for a receipt with no balance left", async () => {
    setLockPrice("cysFLR", 5n * 10n ** 18n);

    render(ReceiptsTable, {
      receipts: [receiptAt(2n * 10n ** 18n, 0n)],
      token: cysFLR,
    });

    expect(cell("total-locked-0")).toBe("0.00000");
    expect(cell("reup-per-1-0")).toBe("0.00000");
    expect(cell("reup-total-0")).toBe("0.00000");
    expect(cell("reup-total-sum")).toBe("0.00000 cysFLR");
  });
});

describe("ReceiptsTable re-up columns and toggle", () => {
  beforeEach(() => {
    noStats();
  });

  it("shows the re-up headers, per-row cells and grand-total card by default", async () => {
    setLockPrice("cysFLR", 5n * 10n ** 18n);

    render(ReceiptsTable, {
      receipts: [
        receiptAt(2n * 10n ** 18n, 4n * 10n ** 18n),
        receiptAt(4n * 10n ** 18n, 4n * 10n ** 18n),
      ],
      token: cysFLR,
    });

    expect(screen.getByTestId("reup-toggle")).toBeChecked();
    expect(screen.getByTestId("headers")).toHaveTextContent(
      "Addl cysFLR per 1 sFLR",
    );
    expect(screen.getByTestId("headers")).toHaveTextContent(
      "Total addl cysFLR",
    );
    expect(screen.getByTestId("reup-per-1-0")).toBeInTheDocument();
    expect(screen.getByTestId("reup-total-0")).toBeInTheDocument();
    expect(screen.getByTestId("reup-per-1-1")).toBeInTheDocument();
    expect(screen.getByTestId("reup-total-1")).toBeInTheDocument();
    expect(screen.getByTestId("reup-total-sum")).toBeInTheDocument();
  });

  it("hides every re-up column, cell and the grand-total card when toggled off, and restores them when toggled back on", async () => {
    setLockPrice("cysFLR", 5n * 10n ** 18n);

    render(ReceiptsTable, {
      receipts: [receiptAt(2n * 10n ** 18n, 4n * 10n ** 18n)],
      token: cysFLR,
    });

    await fireEvent.click(screen.getByTestId("reup-toggle"));

    await waitFor(() => {
      expect(screen.queryByTestId("reup-per-1-0")).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("reup-total-0")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reup-total-sum")).not.toBeInTheDocument();
    expect(screen.getByTestId("headers")).not.toHaveTextContent(
      "Addl cysFLR per 1 sFLR",
    );
    expect(screen.getByTestId("headers")).not.toHaveTextContent(
      "Total addl cysFLR",
    );

    // The pre-existing columns are untouched by the toggle.
    expect(screen.getByTestId("total-locked-0")).toBeInTheDocument();
    expect(screen.getByTestId("number-held-0")).toBeInTheDocument();
    expect(screen.getByTestId("locked-price-0")).toBeInTheDocument();
    expect(screen.getByTestId("redeem-button-0")).toBeInTheDocument();

    await fireEvent.click(screen.getByTestId("reup-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("reup-per-1-0")).toBeInTheDocument();
    });
    expect(cell("reup-total-0")).toBe("6.00000");
    expect(cell("reup-total-sum")).toBe("6.00000 cysFLR");
  });

  it("does not render the grand-total card when there are no receipts", async () => {
    setLockPrice("cysFLR", 5n * 10n ** 18n);

    render(ReceiptsTable, { receipts: [], token: cysFLR });

    expect(screen.getByTestId("reup-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("reup-total-sum")).not.toBeInTheDocument();
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import ReceiptsTable from "./ReceiptsTable.svelte";
import { describe, it, expect } from "vitest";
import { mockReceipt } from "$lib/mocks/mockReceipt";
import type { CyToken, Receipt } from "$lib/types";

// 0.05 locked at 0.030005 per token: every figure except number-held has a
// sixth decimal that rounding would carry into the fifth.
const sixthDecimalReceipt = {
  ...mockReceipt,
  balance: 50000000000000000n,
  tokenId: "30005000000000000",
};

const mockReceipts = [mockReceipt, sixthDecimalReceipt];

// Hand-written per-row literals, truncated (never rounded) to five places.
const expectedCells = [
  {
    lockedPrice: "0.02308",
    numberHeld: "0.03692",
    totalLocked: "1.60000",
    flrPerReceipt: "43.32755",
  },
  {
    lockedPrice: "0.03000",
    numberHeld: "0.05000",
    totalLocked: "1.66638",
    flrPerReceipt: "33.32777",
  },
];

describe("ReceiptsTable Component", () => {
  const selectedToken: CyToken = {
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

  it("renders the receipts table with correct headers and data", async () => {
    const { component } = render(ReceiptsTable, {
      receipts: mockReceipts as unknown as Receipt[],
      token: selectedToken,
    });

    expect(screen.getByTestId("headers")).toBeInTheDocument();

    // Exact match: a sixth rendered digit must fail.
    for (let i = 0; i < mockReceipts.length; i++) {
      expect(screen.getByTestId(`locked-price-${i}`).textContent?.trim()).toBe(
        expectedCells[i].lockedPrice,
      );
      expect(screen.getByTestId(`number-held-${i}`).textContent?.trim()).toBe(
        expectedCells[i].numberHeld,
      );
      expect(screen.getByTestId(`total-locked-${i}`).textContent?.trim()).toBe(
        expectedCells[i].totalLocked,
      );
    }

    // readableFlrPerReceipt is carried on the mapped receipt handed to
    // ReceiptModal, not rendered by the table; read it from the Svelte 4
    // dev-build instance snapshot that vitest compiles with.
    const { mappedReceipts } = (
      component as unknown as {
        $capture_state: () => { mappedReceipts: Receipt[] };
      }
    ).$capture_state();
    expect(mappedReceipts.map((r) => r.readableFlrPerReceipt)).toEqual(
      expectedCells.map((c) => c.flrPerReceipt),
    );
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

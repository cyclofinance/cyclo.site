import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import ReceiptsTable from "./ReceiptsTable.svelte";
import { describe, it, expect } from "vitest";
import { mockReceipt } from "$lib/mocks/mockReceipt";
import type { CyToken, Receipt } from "$lib/types";
import { formatUnits } from "viem";

function trimToDecimals(decimalString: string, places: number): string {
  const [whole, frac = ""] = decimalString.split(".");
  return `${whole}.${(frac + "0".repeat(places)).slice(0, places)}`;
}

const mockReceipts = [mockReceipt, mockReceipt];

describe("ReceiptsTable Component", () => {
  const selectedToken: CyToken = {
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

  it("renders the receipts table with correct headers and data", async () => {
    render(ReceiptsTable, {
      receipts: mockReceipts as unknown as Receipt[],
      token: selectedToken,
    });

    expect(screen.getByTestId("headers")).toBeInTheDocument();

    for (let i = 0; i < mockReceipts.length; i++) {
      expect(screen.getByTestId(`locked-price-${i}`)).toHaveTextContent(
        trimToDecimals(
          formatUnits(BigInt(mockReceipts[i].tokenId), 18),
          5,
        ),
      );
      expect(screen.getByTestId(`number-held-${i}`)).toHaveTextContent(
        trimToDecimals(
          formatUnits(mockReceipts[i].balance, 18),
          5,
        ),
      );
      expect(screen.getByTestId(`total-locked-${i}`)).toHaveTextContent(
        trimToDecimals(mockReceipts[i].readableTotalsFlr, 5),
      );
    }
  });

  it("displays exact string-truncated 5th decimal, not Number()-rounded value", async () => {
    const precisionReceipt = {
      ...mockReceipt,
      balance: 36928000000000000n,
      tokenId: "23080000000000000",
    };
    render(ReceiptsTable, {
      receipts: [precisionReceipt] as unknown as Receipt[],
      token: selectedToken,
    });

    const numberHeld = screen.getByTestId("number-held-0");
    expect(numberHeld).toHaveTextContent("0.03692");
    expect(numberHeld).not.toHaveTextContent("0.03693");
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

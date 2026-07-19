import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import ReceiptsTable from "./ReceiptsTable.svelte";
import { describe, it, expect } from "vitest";
import { mockReceipt } from "$lib/mocks/mockReceipt";
import type { CyToken, Receipt } from "$lib/types";
import { formatEther } from "ethers";
import { trimToDecimals } from "$lib/utils/trimToDecimals";

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
        trimToDecimals(formatEther(mockReceipts[i].tokenId), 5),
      );
      expect(screen.getByTestId(`number-held-${i}`)).toHaveTextContent(
        trimToDecimals(formatEther(mockReceipts[i].balance), 5),
      );
      expect(screen.getByTestId(`total-locked-${i}`)).toHaveTextContent(
        trimToDecimals(mockReceipts[i].readableTotalsFlr, 5),
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

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import ReceiptsTable from "./ReceiptsTable.svelte";
import { describe, it, expect } from "vitest";
import { mockReceipt } from "$lib/mocks/mockReceipt";
import type { CyToken, Receipt } from "$lib/types";
import { formatEther } from "ethers";

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

  it("re-renders rows when the receipts prop is updated (#360)", async () => {
    const initialReceipts = [
      {
        ...mockReceipt,
        balance: 1000000000000000000n,
        tokenId: "2000000000000000000",
      },
    ];
    const updatedReceipts = [
      {
        ...mockReceipt,
        balance: 2500000000000000000n,
        tokenId: "2000000000000000000",
      },
      {
        ...mockReceipt,
        balance: 500000000000000000n,
        tokenId: "4000000000000000000",
      },
    ];

    const { rerender } = render(ReceiptsTable, {
      receipts: initialReceipts as unknown as Receipt[],
      token: selectedToken,
    });

    expect(screen.getByTestId("number-held-0")).toHaveTextContent("1.00000");
    expect(screen.queryByTestId("receipt-row-1")).not.toBeInTheDocument();

    await rerender({ receipts: updatedReceipts as unknown as Receipt[] });

    expect(screen.getByTestId("number-held-0")).toHaveTextContent("2.50000");
    expect(screen.getByTestId("receipt-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("number-held-1")).toHaveTextContent("0.50000");
    expect(screen.getByTestId("locked-price-1")).toHaveTextContent("4.00000");
  });

  it('renders the "0.00000" fallback for malformed balances instead of throwing (#358)', async () => {
    const malformedReceipts = [
      { ...mockReceipt, balance: undefined },
      { ...mockReceipt, balance: "" },
    ];

    render(ReceiptsTable, {
      receipts: malformedReceipts as unknown as Receipt[],
      token: selectedToken,
    });

    expect(screen.getByTestId("number-held-0")).toHaveTextContent("0.00000");
    expect(screen.getByTestId("total-locked-0")).toHaveTextContent("0.00000");
    expect(screen.getByTestId("number-held-1")).toHaveTextContent("0.00000");
    expect(screen.getByTestId("total-locked-1")).toHaveTextContent("0.00000");
  });
});

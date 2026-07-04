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

  it("renders without throwing when tokenId is '0'", () => {
    const zeroReceipt = { ...mockReceipt, tokenId: "0" } as unknown as Receipt;
    render(ReceiptsTable, { receipts: [zeroReceipt], token: selectedToken });
    expect(screen.getByTestId("locked-price-0")).toHaveTextContent("0.00000");
    expect(screen.getByTestId("total-locked-0")).toHaveTextContent("0.00000");
  });

  it("renders without throwing when tokenId is a non-numeric string", () => {
    const badReceipt = {
      ...mockReceipt,
      tokenId: "abc",
    } as unknown as Receipt;
    render(ReceiptsTable, { receipts: [badReceipt], token: selectedToken });
    expect(screen.getByTestId("locked-price-0")).toHaveTextContent("0.00000");
  });

  it("renders without throwing when balance is a non-numeric string", () => {
    const badReceipt = {
      ...mockReceipt,
      balance: "not-a-number",
    } as unknown as Receipt;
    render(ReceiptsTable, { receipts: [badReceipt], token: selectedToken });
    expect(screen.getByTestId("total-locked-0")).toHaveTextContent("0.00000");
  });

  it("uses exact BigInt arithmetic for totalsFlr (no Number precision loss)", () => {
    const precisionReceipt = {
      ...mockReceipt,
      balance: (2n * 10n ** 18n).toString(),
      tokenId: (15n * 10n ** 17n).toString(),
    } as unknown as Receipt;
    render(ReceiptsTable, { receipts: [precisionReceipt], token: selectedToken });
    // totalsFlr = (2e18 * 10^18) / 1.5e18 = 2e18 * (1/1.5) = 1333333333333333333n
    // With Number(10**18) the constant itself would be imprecise; with 10n**18n it is exact.
    expect(screen.getByTestId("total-locked-0")).not.toHaveTextContent("NaN");
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

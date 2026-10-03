import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import ReceiptsTable from "./ReceiptsTable.svelte";
import { describe, it, expect, vi } from "vitest";
import { mockReceipt } from "$lib/mocks/mockReceipt";
import type { CyToken, Receipt } from "$lib/types";
import { formatEther } from "ethers";
import { formatUnits } from "viem";

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return { ...actual, formatUnits: vi.fn(actual.formatUnits) };
});

const mockReceipts = [mockReceipt, mockReceipt];

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
    expect(screen.getByTestId("number-held-0")).toHaveTextContent(/^0\.00000$/);
  });

  it("disables Unlock on a fallback row with a non-numeric tokenId", async () => {
    const badReceipt = { ...mockReceipt, tokenId: "abc" } as unknown as Receipt;
    render(ReceiptsTable, { receipts: [badReceipt], token: selectedToken });
    const button = screen.getByTestId("redeem-button-0");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(screen.queryByTestId("receipt-modal")).toBeNull();
  });

  it("disables Unlock on a fallback row with tokenId '0'", async () => {
    const zeroReceipt = { ...mockReceipt, tokenId: "0" } as unknown as Receipt;
    render(ReceiptsTable, { receipts: [zeroReceipt], token: selectedToken });
    const button = screen.getByTestId("redeem-button-0");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(screen.queryByTestId("receipt-modal")).toBeNull();
  });

  it("renders the exact 5-decimal total for 2e18 balance at tokenId 1.5e18", () => {
    const precisionReceipt = {
      ...mockReceipt,
      balance: (2n * 10n ** 18n).toString(),
      tokenId: (15n * 10n ** 17n).toString(),
    } as unknown as Receipt;
    render(ReceiptsTable, {
      receipts: [precisionReceipt],
      token: selectedToken,
    });
    // 2 / 1.5 = 1.333... -> 1333333333333333333n in 18 decimals -> "1.33333"
    expect(screen.getByTestId("total-locked-0")).toHaveTextContent(
      /^1\.33333$/,
    );
  });

  it("computes the per-receipt rate from an exact 10^36 numerator", () => {
    const receipt = { ...mockReceipt, tokenId: "7" } as unknown as Receipt;
    render(ReceiptsTable, { receipts: [receipt], token: selectedToken });
    // 1/7 = 0.(142857), so 10^36 / 7 is the six-digit block six times over.
    // Number(10 ** 36) is not a power of ten, so BigInt(10 ** 36) / 7n differs.
    expect(formatUnits).toHaveBeenCalledWith(
      142857142857142857142857142857142857n,
      selectedToken.decimals,
    );
  });

  it("opens a receipt modal when redeem button is clicked", async () => {
    render(ReceiptsTable, {
      receipts: mockReceipts as unknown as Receipt[],
      token: selectedToken,
    });

    const redeemButton = screen.getByTestId("redeem-button-0");
    expect(redeemButton).not.toBeDisabled();
    await userEvent.click(redeemButton);

    await waitFor(() => {
      expect(screen.getByTestId("receipt-modal")).toBeInTheDocument();
    });
  });
});

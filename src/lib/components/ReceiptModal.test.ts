import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/svelte";
import ReceiptModal from "./ReceiptModal.svelte";
import transactionStore from "$lib/transactionStore";
import { readContract } from "@wagmi/core";
import { formatEther, parseEther } from "ethers";
import { mockReceipt } from "$lib/mocks/mockReceipt";
import userEvent from "@testing-library/user-event";
import type { CyToken, Receipt } from "$lib/types";

const { mockBalancesStore, mockSignerAddressStore } = await vi.hoisted(
  () => import("$lib/mocks/mockStores"),
);

vi.mock("$lib/balancesStore", async () => {
  return {
    default: mockBalancesStore,
  };
});

vi.mock("@wagmi/core", () => {
  return {
    readContract: vi.fn(),
  };
});

describe("ReceiptModal Component", () => {
  const initiateUnlockTransactionSpy = vi.spyOn(
    transactionStore,
    "handleUnlockTransaction",
  );

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

  const setSignerBalances = (cysFLR: bigint, cyWETH: bigint) =>
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: cyWETH,
          signerUnderlyingBalance: cyWETH,
        },
        cysFLR: {
          signerBalance: cysFLR,
          signerUnderlyingBalance: cysFLR,
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );

  beforeEach(() => {
    initiateUnlockTransactionSpy.mockClear();
    vi.resetAllMocks();
    mockSignerAddressStore.mockSetSubscribeValue(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    );
  });

  it("tracks the live receipt when the bound receipt prop is swapped", async () => {
    setSignerBalances(parseEther("1000"), BigInt(0));

    const receiptB = {
      ...mockReceipt,
      balance: 50000000000000000n,
      tokenId: "46160000000000000",
    } as Receipt;

    const { rerender } = render(ReceiptModal, {
      receipt: mockReceipt,
      token: selectedToken,
    });
    await rerender({ receipt: receiptB, token: selectedToken });

    await waitFor(() => {
      expect(screen.getByTestId("lock-up-price")).toHaveTextContent(
        Number(formatEther(receiptB.tokenId)).toString(),
      );
      expect(screen.getByTestId("balance")).toHaveTextContent(
        Number(formatEther(receiptB.balance)).toString(),
      );
    });

    const maxButton = screen.getByTestId("set-val-to-max");
    await fireEvent.click(maxButton);

    await waitFor(() => {
      expect(screen.getByTestId("redeem-input")).toHaveValue(
        formatEther(receiptB.balance),
      );
    });

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton.getAttribute("disabled")).toBeFalsy();
    });
    await userEvent.click(screen.getByTestId("unlock-button"));

    await waitFor(() => {
      expect(initiateUnlockTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: receiptB.tokenId,
          assets: receiptB.balance,
        }),
      );
    });
  });

  it("caps max redeem by the modal token's balance when receipt.token is unset", async () => {
    setSignerBalances(BigInt(0), parseEther("1000"));

    const cyWethToken: CyToken = {
      ...selectedToken,
      name: "cyWETH",
      symbol: "cyWETH",
    };
    const tokenlessReceipt = { ...mockReceipt, token: undefined } as Receipt;

    render(ReceiptModal, { receipt: tokenlessReceipt, token: cyWethToken });

    const maxButton = screen.getByTestId("set-val-to-max");
    await fireEvent.click(maxButton);

    await waitFor(() => {
      expect(screen.getByTestId("redeem-input")).toHaveValue(
        formatEther(mockReceipt.balance),
      );
    });
  });

  it("blocks unlock and shows CONNECT WALLET when no signer is present", async () => {
    mockSignerAddressStore.mockSetSubscribeValue("");
    setSignerBalances(parseEther("1000"), BigInt(0));

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.0001");

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton).toHaveTextContent("CONNECT WALLET");
      expect(unlockButton).toBeDisabled();
    });
    await userEvent.click(screen.getByTestId("unlock-button"));
    expect(initiateUnlockTransactionSpy).not.toHaveBeenCalled();
  });

  it("blocks unlock and shows WRONG NETWORK when the receipt chain mismatches the selected token", async () => {
    setSignerBalances(parseEther("1000"), BigInt(0));

    const wrongChainReceipt = { ...mockReceipt, chainId: "42161" } as Receipt;

    render(ReceiptModal, { receipt: wrongChainReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.0001");

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton).toHaveTextContent("WRONG NETWORK");
      expect(unlockButton).toBeDisabled();
    });
    await userEvent.click(screen.getByTestId("unlock-button"));
    expect(initiateUnlockTransactionSpy).not.toHaveBeenCalled();
  });

  it("should render the modal with the correct receipt balance and lock-up price", async () => {
    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const receiptBalance = Number(formatEther(mockReceipt.balance));
    const lockUpPrice = Number(formatEther(mockReceipt.tokenId));

    await waitFor(() => {
      expect(screen.getByTestId("balance")).toHaveTextContent(
        receiptBalance.toString(),
      );
      expect(screen.getByTestId("lock-up-price")).toHaveTextContent(
        lockUpPrice.toString(),
      );
    });
  });

  it("should calculate and display correct flrToReceive when redeem amount is entered", async () => {
    vi.mocked(readContract).mockImplementation(() =>
      Promise.resolve(BigInt("21663778162911611785")),
    );

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.5");

    await waitFor(() => {
      expect(screen.getByTestId("flr-to-receive")).toHaveTextContent(
        "21.663778162911611785 sFLR",
      );
    });
  });

  it("should disable the unlock button when the redeem amount is greater than balance", async () => {
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
        cysFLR: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "2000");

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton).toBeDisabled();
    });
  });

  it('should display "INSUFFICIENT cysFLR" if cysFLR balance is insufficient', async () => {
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
        cysFLR: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.00002");
    await userEvent.tab();

    await waitFor(() => {
      const button = screen.getByTestId("unlock-button");
      expect(button).toHaveTextContent("INSUFFICIENT cyTOKEN");
      expect(button).toBeDisabled();
    });
  });

  it("should enable the unlock button when a valid amount is entered", async () => {
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(1000000000000000000),
        },
        cysFLR: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.5");
    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton.getAttribute("disabled")).toBeFalsy();
    });
    screen.debug();
  });

  it("clears the redeem entry and follows the swapped-in receipt's price and tokenId", async () => {
    // A20-1: fields captured once at mount mixed one receipt's entry with
    // another's after a swap: the lock price shown came from the first
    // receipt while the submitted tokenId came from the second.
    setSignerBalances(parseEther("1000"), BigInt(0));
    vi.mocked(readContract).mockImplementation(() =>
      Promise.resolve(BigInt("10000000000000000")),
    );

    const receiptB = {
      ...mockReceipt,
      balance: 50000000000000000n,
      tokenId: "34560000000000000",
    } as Receipt;

    const { rerender } = render(ReceiptModal, {
      receipt: mockReceipt,
      token: selectedToken,
    });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.5");
    expect(input).toHaveValue("0.5");

    await rerender({ receipt: receiptB, token: selectedToken });

    await waitFor(() => {
      expect(screen.getByTestId("redeem-input")).toHaveValue("");
      expect(screen.getByTestId("lock-up-price")).toHaveTextContent(
        Number(formatEther(receiptB.tokenId)).toString(),
      );
      expect(screen.getByTestId("balance")).toHaveTextContent(
        Number(formatEther(receiptB.balance)).toString(),
      );
    });

    await fireEvent.click(screen.getByTestId("set-val-to-max"));
    await waitFor(() => {
      expect(screen.getByTestId("redeem-input")).toHaveValue(
        formatEther(receiptB.balance),
      );
      expect(screen.getByTestId("unlock-button")).not.toBeDisabled();
    });
    await userEvent.click(screen.getByTestId("unlock-button"));

    await waitFor(() => {
      expect(initiateUnlockTransactionSpy).toHaveBeenCalledOnce();
      expect(initiateUnlockTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: receiptB.tokenId,
          assets: receiptB.balance,
        }),
      );
    });
  });

  it("does not submit when the signer is undefined, even after MAX", async () => {
    // A20-3: a disconnected wallet leaves $signerAddress undefined; MAX still
    // fills a positive amount from the balance store, so only the signer
    // gate stands between the click and handleUnlockTransaction.
    mockSignerAddressStore.mockSetSubscribeValue(
      undefined as unknown as string,
    );
    setSignerBalances(parseEther("1000"), BigInt(0));

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    await fireEvent.click(screen.getByTestId("set-val-to-max"));
    await waitFor(() => {
      expect(screen.getByTestId("redeem-input")).toHaveValue(
        formatEther(mockReceipt.balance),
      );
    });

    const unlockButton = screen.getByTestId("unlock-button");
    expect(unlockButton).toHaveTextContent("CONNECT WALLET");
    expect(unlockButton).toBeDisabled();
    await userEvent.click(unlockButton);
    expect(initiateUnlockTransactionSpy).not.toHaveBeenCalled();
  });

  it("keeps the typed redeem entry while the receipt is unchanged", async () => {
    // The reset assigns the entry fields, so a block keyed on anything but the
    // receipt's identity re-runs on its own writes and wipes the amount as it
    // is typed.
    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.25");

    await waitFor(() => {
      expect(screen.getByTestId("redeem-input")).toHaveValue("0.25");
    });
  });

  it("reads the signer balance for the modal's own token, not a cysFLR default", async () => {
    // A20-2: the hardcoded "cysFLR" fallback read the wrong balance for a
    // receipt whose token is undefined. cyWETH holds 1, cysFLR holds 0, and
    // the receipt names no token — a cysFLR read reports 0 and disables.
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(1000000000000000000),
        },
        cysFLR: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
      },
      { cusdxOutput: BigInt(0), cyTokenOutput: BigInt(0) },
    );

    vi.mocked(readContract).mockImplementation(() =>
      Promise.resolve(BigInt("10000000000000000")),
    );

    render(ReceiptModal, {
      receipt: { ...mockReceipt, token: undefined },
      token: { ...selectedToken, name: "cyWETH" },
    });

    const input = screen.getByTestId("redeem-input");
    // Below the receipt's own balance, so the only thing that can report
    // insufficiency here is the cyToken balance read.
    await userEvent.type(input, "0.01");

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton).not.toHaveTextContent("INSUFFICIENT");
      expect(unlockButton.getAttribute("disabled")).toBeFalsy();
    });
  });

  it("reports WRONG NETWORK and does not submit when the receipt's chain differs from the selected token's", async () => {
    // A20-3: the button did not gate on the receipt/wallet chain matching,
    // and a greyed button alone does not tell the user why.
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(1000000000000000000),
        },
        cysFLR: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(1000000000000000000),
        },
      },
      { cusdxOutput: BigInt(0), cyTokenOutput: BigInt(0) },
    );

    vi.mocked(readContract).mockImplementation(() =>
      Promise.resolve(BigInt("10000000000000000")),
    );

    // Arbitrum receipt while the selected token is on Flare.
    render(ReceiptModal, {
      receipt: { ...mockReceipt, chainId: "42161" },
      token: selectedToken,
    });

    const input = screen.getByTestId("redeem-input");
    // Below both the receipt balance and the cyToken balance, so neither
    // insufficiency branch can disable the button on this test's behalf.
    await userEvent.type(input, "0.01");

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton).toHaveTextContent("WRONG NETWORK");
      expect(unlockButton).toBeDisabled();
    });
    await userEvent.click(screen.getByTestId("unlock-button"));
    expect(initiateUnlockTransactionSpy).not.toHaveBeenCalled();
  });

  it("should call handleUnlockTransaction when unlock button is clicked", async () => {
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
        cysFLR: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(1000000000000000000),
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    const input = screen.getByTestId("redeem-input");
    await userEvent.type(input, "0.0001");

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton.getAttribute("disabled")).toBeFalsy();
    });
    const unlockButton = screen.getByTestId("unlock-button");
    await userEvent.click(unlockButton);

    await waitFor(() => {
      expect(initiateUnlockTransactionSpy).toHaveBeenCalledOnce();
    });
  });

  it("should set exact receipt balance when max button is clicked and receipt balance is less than cysFlrBalance", async () => {
    const mockCysFlrBalance = BigInt("1000000000000000000");
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(1000000000000000000),
        },
        cysFLR: {
          signerBalance: mockCysFlrBalance,
          signerUnderlyingBalance: mockCysFlrBalance,
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );
    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    // Find the max button within the input component and click it
    const maxButton = screen.getByTestId("set-val-to-max");
    await fireEvent.click(maxButton);

    // Check that the display value is correct
    await waitFor(() => {
      const input = screen.getByTestId("redeem-input");
      expect(input).toHaveValue(formatEther(mockReceipt.balance));
    });

    // Click unlock button
    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton.getAttribute("disabled")).toBeFalsy();
      userEvent.click(unlockButton);
    });

    // Verify initiateUnlockTransaction was called with exact cysFlrBalance
    await waitFor(() => {
      expect(initiateUnlockTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          assets: mockReceipt.balance,
        }),
      );
    });
  });

  it("should set cysFlrBalance when max button is clicked and receipt balance is greater than cysFlrBalance", async () => {
    const mockCysFlrBalance = parseEther("0.0001"); // 1 cysFLR

    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
        cysFLR: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(0),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(1000000000000000000),
        },
        cysFLR: {
          signerBalance: mockCysFlrBalance,
          signerUnderlyingBalance: mockCysFlrBalance,
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );

    render(ReceiptModal, { receipt: mockReceipt, token: selectedToken });

    // Find the max button within the input component and click it
    const maxButton = screen.getByTestId("set-val-to-max");
    await fireEvent.click(maxButton);

    // Check that the display value is correct
    await waitFor(() => {
      const input = screen.getByTestId("redeem-input");
      expect(input).toHaveValue(formatEther(mockCysFlrBalance));
    });

    // Click unlock button

    await waitFor(() => {
      const unlockButton = screen.getByTestId("unlock-button");
      expect(unlockButton.getAttribute("disabled")).toBeFalsy();
      userEvent.click(unlockButton);
    });

    // Verify initiateUnlockTransaction was called with exact cysFlrBalance
    await waitFor(() => {
      expect(initiateUnlockTransactionSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          assets: mockCysFlrBalance,
        }),
      );
    });
  });
});

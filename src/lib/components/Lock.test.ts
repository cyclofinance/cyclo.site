import { render, screen, waitFor } from "@testing-library/svelte";
import Lock from "./Lock.svelte";
import transactionStore from "$lib/transactionStore";
import userEvent from "@testing-library/user-event";
import { vi, describe, beforeEach, it, expect } from "vitest";
import {
  mockSignerAddressStore,
  mockWrongNetworkStore,
} from "$lib/mocks/mockStores";
import { parseEther } from "ethers";
import { parseUnits } from "viem";

const { mockBalancesStore } = await vi.hoisted(
  () => import("$lib/mocks/mockStores"),
);

vi.mock("../../generated", async (importOriginal) => {
  return {
    ...((await importOriginal()) as object),
    simulateErc20PriceOracleReceiptVaultPreviewDeposit: vi.fn(async () => ({
      result: 14920000000000000n,
    })),
  };
});

vi.mock("$lib/balancesStore", async () => {
  return {
    default: {
      ...mockBalancesStore,
      refreshSwapQuote: vi.fn(),
      refreshBalances: vi.fn(),
      refreshPrices: vi.fn(),
      refreshDepositPreviewSwapValue: vi.fn(),
    },
  };
});

vi.mock("$lib/transactionStore", async (importOriginal) => ({
  default: {
    ...((await importOriginal) as object),
    handleLockTransaction: vi.fn().mockResolvedValue({}),
  },
}));

describe("Lock Component", () => {
  const initiateLockTransactionSpy = vi.spyOn(
    transactionStore,
    "handleLockTransaction",
  );

  beforeEach(() => {
    initiateLockTransactionSpy.mockClear();
    mockSignerAddressStore.mockSetSubscribeValue(
      "0x1234567890123456789012345678901234567890",
    );
    mockWrongNetworkStore.mockSetSubscribeValue(false);
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
          lockPrice: BigInt(1),
          price: BigInt(1234000000000000000n),
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
          signerBalance: BigInt(9876000000000000000n),
          signerUnderlyingBalance: BigInt(9876000000000000000n),
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );
  });

  it("should render sFLR balance and price ratio correctly", async () => {
    mockSignerAddressStore.mockSetSubscribeValue(
      "0x1234567890123456789012345678901234567890",
    );
    render(Lock);
    await waitFor(() => {
      expect(screen.getByTestId("underlying-balance")).toBeInTheDocument();

      expect(screen.getByTestId("underlying-balance")).toHaveTextContent(
        "9.876",
      );
      expect(screen.getByTestId("price-ratio")).toBeInTheDocument();
    });
  });

  it("should calculate the correct cysFLR amount based on input", async () => {
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
          lockPrice: BigInt(parseEther("1")),
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
        cyTokenOutput: BigInt(1234e18),
      },
    );
    render(Lock);

    const input = screen.getByTestId("lock-input");
    await userEvent.type(input, "0.5");

    await waitFor(() => {
      const priceRatio = screen.getByTestId("price-ratio");
      expect(priceRatio).toBeInTheDocument();
      const calculatedCysflr = screen.getByTestId("calculated-cysflr");
      expect(calculatedCysflr).toHaveTextContent("1234");
    });
  });

  it("should call handleLockTransaction when lock button is clicked", async () => {
    render(Lock);

    const input = screen.getByTestId("lock-input");
    await userEvent.type(input, "0.0005");

    const lockButton = screen.getByTestId("lock-button");
    await userEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getByTestId("disclaimer-modal")).toBeInTheDocument();
    });
  });

  it("should disable the lock button if SFLR balance is insufficient", async () => {
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
          lockPrice: BigInt(1),
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
    render(Lock);
    const input = screen.getByTestId("lock-input");
    await userEvent.type(input, "500000");
    const lockButton = screen.getByTestId("lock-button");
    expect(lockButton).toBeDisabled();
    expect(lockButton).toHaveTextContent("INSUFFICIENT sFLR");
  });

  it("should disable the lock button if no value had been entered", async () => {
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
          lockPrice: BigInt(1),
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
    render(Lock);
    const lockButton = screen.getByTestId("lock-button");
    expect(lockButton).toBeDisabled();
    expect(lockButton).toHaveTextContent("LOCK");
  });

  it("should show the connect message if there is no signerAddress", async () => {
    mockSignerAddressStore.mockSetSubscribeValue("");
    render(Lock);
    await waitFor(() => {
      expect(screen.getByTestId("connect-message")).toBeInTheDocument();
    });
  });

  it("should show the sFLR balance if there is a signerAddress", async () => {
    mockSignerAddressStore.mockSetSubscribeValue("0x0000");
    render(Lock);
    await waitFor(() => {
      const balance = screen.getByTestId("your-balance");
      expect(balance).toBeInTheDocument();
      expect(balance).toHaveTextContent("9.876");
    });
  });

  it("should display correct USD value", async () => {
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
          lockPrice: BigInt(1000000000000000000),
          price: BigInt(1000000000000000000),
          supply: BigInt(1000000000000000000),
          underlyingTvl: BigInt(1000000000000000000),
          usdTvl: BigInt(1000000000000000000),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(0),
          signerUnderlyingBalance: BigInt(0),
        },
        cysFLR: {
          signerBalance: BigInt(1000000000000000000),
          signerUnderlyingBalance: BigInt(0),
        },
      },
      {
        cusdxOutput: BigInt(3000000000000000000),
        cyTokenOutput: BigInt(0),
      },
    );

    render(Lock);

    const input = screen.getByTestId("lock-input");
    await userEvent.type(input, "500000");

    await waitFor(() => {
      const usdValueElement = screen.getByTestId("calculated-cysflr-usd");
      expect(usdValueElement).toHaveTextContent(
        "Current market value ~$ 3000000000000",
      );
    });
  });

  it("should disable the lock button when wallet is on the wrong network", async () => {
    mockWrongNetworkStore.mockSetSubscribeValue(true);
    render(Lock);

    const input = screen.getByTestId("lock-input");
    await userEvent.type(input, "0.0005");

    const lockButton = screen.getByTestId("lock-button");
    expect(lockButton).toBeDisabled();
  });

  it("should not dispatch lock transaction if wallet switches to wrong network between disclaimer open and acknowledge", async () => {
    render(Lock);

    const input = screen.getByTestId("lock-input");
    await userEvent.type(input, "0.0005");

    const lockButton = screen.getByTestId("lock-button");
    await userEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getByTestId("disclaimer-modal")).toBeInTheDocument();
    });

    mockWrongNetworkStore.mockSetSubscribeValue(true);

    const acceptButton = screen.getByTestId("disclaimer-acknowledge-button");
    await userEvent.click(acceptButton);

    expect(initiateLockTransactionSpy).not.toHaveBeenCalled();
  });

  it("should display the same amount it sends to handleLockTransaction when MAX is clicked", async () => {
    // 18-decimal balance with all digits non-trivial. Pre-A17-3 setValueToMax
    // ran the displayed amount through Number(formatUnits(...)).toString(),
    // which truncates to ~15 sig figs while assets carried the full balance.
    // The user saw a different number than they signed.
    const fullPrecisionBalance = 9876543210123456789n;
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: 0n,
          price: 0n,
          supply: 0n,
          underlyingTvl: 0n,
          usdTvl: 0n,
        },
        cysFLR: {
          lockPrice: 1n,
          price: 0n,
          supply: 0n,
          underlyingTvl: 0n,
          usdTvl: 0n,
        },
      },
      {
        cyWETH: { signerBalance: 0n, signerUnderlyingBalance: 0n },
        cysFLR: {
          signerBalance: fullPrecisionBalance,
          signerUnderlyingBalance: fullPrecisionBalance,
        },
      },
      { cusdxOutput: 0n, cyTokenOutput: 0n },
    );

    render(Lock);

    const maxButton = screen.getByTestId("set-val-to-max");
    await userEvent.click(maxButton);

    const input = screen.getByTestId("lock-input") as HTMLInputElement;
    const displayedAmount = input.value;

    const lockButton = screen.getByTestId("lock-button");
    await userEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getByTestId("disclaimer-modal")).toBeInTheDocument();
    });

    const acceptButton = screen.getByTestId("disclaimer-acknowledge-button");
    await userEvent.click(acceptButton);

    const callArgs = initiateLockTransactionSpy.mock.calls[0][0];
    // Drift: displayed amount must equal signed amount.
    expect(callArgs.assets).toBe(parseUnits(displayedAmount, 18));
    // Truncation: signed amount must equal the full balance, not a Number()-
    // round-tripped subset that leaves dust behind.
    expect(callArgs.assets).toBe(fullPrecisionBalance);
  });

  it("should activate lock transaction when the disclaimer is accepted", async () => {
    render(Lock);

    const input = screen.getByTestId("lock-input");
    await userEvent.type(input, "0.0005");

    const lockButton = screen.getByTestId("lock-button");
    await userEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getByTestId("disclaimer-modal")).toBeInTheDocument();
    });

    screen.debug();

    const acceptButton = screen.getByTestId("disclaimer-acknowledge-button");
    await userEvent.click(acceptButton);
    expect(initiateLockTransactionSpy).toHaveBeenCalled();
  });
});

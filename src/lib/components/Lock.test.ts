import { render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import Lock from "./Lock.svelte";
import transactionStore from "$lib/transactionStore";
import userEvent from "@testing-library/user-event";
import { vi, describe, beforeEach, it, expect } from "vitest";
import {
  mockSignerAddressStore,
  mockWrongNetworkStore,
  web3ModalStore,
} from "$lib/mocks/mockStores";
import { parseEther } from "ethers";
import { parseUnits, type Hex } from "viem";
import { selectedCyToken } from "$lib/stores";
import { switchNetwork } from "@wagmi/core";
import type { CyToken } from "$lib/types";

vi.mock("@wagmi/core", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  switchNetwork: vi.fn().mockResolvedValue(undefined),
}));

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

vi.mock("$lib/transactionStore", async (importOriginal) => {
  const mod = await importOriginal<typeof import("$lib/transactionStore")>();
  return {
    ...mod,
    default: {
      ...mod.default,
      handleLockTransaction: vi.fn().mockResolvedValue({}),
    },
  };
});

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

  it("exposes the connect-wallet trigger as a button that opens the wallet modal", async () => {
    mockSignerAddressStore.mockSetSubscribeValue("");
    const openSpy = vi.fn();
    web3ModalStore.set({ open: openSpy });
    render(Lock);

    // A real button: keyboard-focusable and announced with the button role,
    // unlike the previous div with a bare click handler.
    const connectButton = await screen.findByRole("button", {
      name: /connect a wallet to see/i,
    });
    expect(connectButton).toHaveAttribute("type", "button");
    expect(connectButton).toBe(screen.getByTestId("connect-message"));

    await userEvent.click(connectButton);
    expect(openSpy).toHaveBeenCalledTimes(1);
    web3ModalStore.set({ open: () => {} });
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
    // 18-decimal balance with all digits non-trivial. A Number() round-trip
    // on formatUnits would truncate to ~15 sig figs; the test guards
    // against any path that introduces that drift between displayed amount
    // and signed amount.
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

describe("Lock component wallet auto-switch guard", () => {
  const baseToken: CyToken = {
    name: "cysFLR",
    address: "0x19831cfB53A0dbeAD9866C43557C1D48DfF76567" as Hex,
    underlyingAddress: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB" as Hex,
    underlyingSymbol: "sFLR",
    receiptAddress: "0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09" as Hex,
    symbol: "cysFLR",
    decimals: 18,
    chainId: 14,
    networkName: "Flare",
    active: true,
  };

  // Chain ids with no supportedNetworks entry: setActiveNetworkByChainId
  // no-ops for these, so the network-mismatch condition stays true.
  const unsupportedToken = (chainId: number): CyToken => ({
    ...baseToken,
    chainId,
  });

  beforeEach(() => {
    vi.mocked(switchNetwork).mockClear();
    vi.mocked(switchNetwork).mockResolvedValue(
      undefined as unknown as Awaited<ReturnType<typeof switchNetwork>>,
    );
    mockSignerAddressStore.mockSetSubscribeValue(
      "0x1234567890123456789012345678901234567890",
    );
    mockWrongNetworkStore.mockSetSubscribeValue(false);
    selectedCyToken.set(baseToken);
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

  it("attempts the wallet switch only once while the unsupported chain mismatch persists", async () => {
    render(Lock);

    selectedCyToken.set(unsupportedToken(999));
    await waitFor(() => {
      expect(switchNetwork).toHaveBeenCalledTimes(1);
    });

    // Any store update that invalidates a dependency re-runs the reactive
    // block while the mismatch persists. Without the last-attempt guard
    // this re-fires the wallet popup for the same chain.
    selectedCyToken.set(unsupportedToken(999));
    await tick();
    await tick();
    expect(switchNetwork).toHaveBeenCalledTimes(1);
  });

  it("attempts a new wallet switch when the desired chain id changes", async () => {
    render(Lock);

    selectedCyToken.set(unsupportedToken(999));
    await waitFor(() => {
      expect(switchNetwork).toHaveBeenCalledTimes(1);
    });

    selectedCyToken.set(unsupportedToken(888));
    await waitFor(() => {
      expect(switchNetwork).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(switchNetwork).mock.calls[1][1]).toEqual({
      chainId: 888,
    });
  });
});

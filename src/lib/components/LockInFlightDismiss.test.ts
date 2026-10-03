import { render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import userEvent from "@testing-library/user-event";
import { vi, describe, beforeEach, afterEach, it, expect } from "vitest";
import { get } from "svelte/store";
import { arbitrum } from "@wagmi/core/chains";
import { switchNetwork } from "@wagmi/core";
import Lock from "./Lock.svelte";
import TransactionModal from "./TransactionModal.svelte";
import transactionStore, { TransactionStatus } from "$lib/transactionStore";
import {
  readErc20Allowance,
  writeErc20PriceOracleReceiptVaultDeposit,
} from "../../generated";
import {
  mockSignerAddressStore,
  mockWrongNetworkStore,
} from "$lib/mocks/mockStores";
import {
  selectedCyToken,
  allTokens,
  setActiveNetworkByChainId,
} from "$lib/stores";
import type { CyToken } from "$lib/types";

// The real transactionStore drives Lock and TransactionModal together, so a
// dismiss of the modal reaches the store's reset() exactly as it does in
// the (actions) layout.
vi.mock("@wagmi/core", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  switchNetwork: vi.fn().mockResolvedValue(undefined),
  waitForTransactionReceipt: vi.fn().mockResolvedValue({}),
}));

const { mockBalancesStore } = await vi.hoisted(
  () => import("$lib/mocks/mockStores"),
);

vi.mock("../../generated", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  readErc20Allowance: vi.fn(),
  writeErc20PriceOracleReceiptVaultDeposit: vi.fn(),
  simulateErc20PriceOracleReceiptVaultPreviewDeposit: vi.fn(async () => ({
    result: 14920000000000000n,
  })),
}));

vi.mock("$lib/balancesStore", async () => ({
  default: {
    ...mockBalancesStore,
    refreshSwapQuote: vi.fn(),
    refreshBalances: vi.fn(),
    refreshPrices: vi.fn(),
    refreshDepositPreviewSwapValue: vi.fn(),
  },
}));

vi.mock("$lib/queries/refreshAllReceipts", () => ({
  refreshAllReceipts: vi.fn().mockResolvedValue([]),
}));

describe("Lock component in-flight freeze survives a modal dismiss", () => {
  const preFlightToken = get(allTokens)[0];
  const arbToken = get(allTokens).find(
    (token) => token.chainId === arbitrum.id,
  ) as CyToken;

  beforeEach(() => {
    vi.mocked(switchNetwork).mockClear();
    vi.mocked(readErc20Allowance).mockReset();
    vi.mocked(writeErc20PriceOracleReceiptVaultDeposit).mockReset();
    vi.mocked(writeErc20PriceOracleReceiptVaultDeposit).mockResolvedValue(
      "0xdeposithash",
    );
    mockSignerAddressStore.mockSetSubscribeValue(
      "0x1234567890123456789012345678901234567890",
    );
    mockWrongNetworkStore.mockSetSubscribeValue(false);
    setActiveNetworkByChainId(preFlightToken.chainId);
    selectedCyToken.set(preFlightToken);
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
          price: 1234000000000000000n,
          supply: 0n,
          underlyingTvl: 0n,
          usdTvl: 0n,
        },
      },
      {
        cyWETH: { signerBalance: 0n, signerUnderlyingBalance: 0n },
        cysFLR: {
          signerBalance: 9876000000000000000n,
          signerUnderlyingBalance: 9876000000000000000n,
        },
      },
      { cusdxOutput: 0n, cyTokenOutput: 0n },
    );
  });

  afterEach(() => {
    transactionStore.reset();
    setActiveNetworkByChainId(preFlightToken.chainId);
    selectedCyToken.set(preFlightToken);
  });

  it("keeps the Select, LOCK button and auto-switch frozen after an Escape dismiss, then deposits the pre-flight token", async () => {
    expect(preFlightToken.name).toBe("cysFLR");
    expect(arbToken).toBeDefined();

    let resolveAllowance!: (allowance: bigint) => void;
    vi.mocked(readErc20Allowance).mockReturnValueOnce(
      new Promise<bigint>((resolve) => {
        resolveAllowance = resolve;
      }),
    );

    render(Lock);
    render(TransactionModal);

    await userEvent.type(screen.getByTestId("lock-input"), "1");
    await userEvent.click(screen.getByTestId("lock-button"));
    await waitFor(() => {
      expect(screen.getByTestId("disclaimer-modal")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByTestId("disclaimer-acknowledge-button"));

    // The handler is parked on the allowance read: modal open, form frozen.
    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
    expect(get(transactionStore).status).toBe(
      TransactionStatus.CHECKING_ALLOWANCE,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByTestId("lock-button")).toBeDisabled();

    // Escape dismisses the modal, which calls transactionStore.reset().
    screen.getByRole("dialog").focus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });

    // The freeze must hold: the handler's awaits are still running.
    expect(get(transactionStore).status).toBe(
      TransactionStatus.CHECKING_ALLOWANCE,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByTestId("lock-button")).toBeDisabled();

    // A cross-chain token arriving mid-flight must not move the wallet.
    selectedCyToken.set(arbToken);
    await tick();
    await tick();
    expect(switchNetwork).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toBeDisabled();

    // The deposit leg uses the token captured before the flip.
    resolveAllowance(2n ** 256n - 1n);
    await waitFor(() => {
      expect(writeErc20PriceOracleReceiptVaultDeposit).toHaveBeenCalledTimes(1);
    });
    expect(
      vi.mocked(writeErc20PriceOracleReceiptVaultDeposit).mock.calls[0][1]
        .address,
    ).toBe(preFlightToken.address);
    expect(preFlightToken.address).not.toBe(arbToken.address);

    // Settled: the modal reports success, the freeze lifts, and the
    // deferred auto-switch fires exactly once for the flipped token.
    await waitFor(() => {
      expect(screen.getByTestId("success-icon")).toBeInTheDocument();
    });
    expect(get(transactionStore).status).toBe(TransactionStatus.SUCCESS);
    await waitFor(() => {
      expect(switchNetwork).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(switchNetwork).mock.calls[0][1]).toEqual({
      chainId: arbitrum.id,
    });

    // With the handler settled, dismissing resets the store again.
    await userEvent.click(screen.getByTestId("dismiss-button"));
    expect(get(transactionStore).status).toBe(TransactionStatus.IDLE);
  });
});

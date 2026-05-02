import { render, screen } from "@testing-library/svelte";
import WalletConnect from "./WalletConnect.svelte";
import { describe, it, vi, beforeEach, expect } from "vitest";

const { mockSignerAddressStore, mockConnectedStore, mockWrongNetworkStore } =
  await vi.hoisted(() => import("$lib/mocks/mockStores"));

describe("WalletConnect component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it('displays "Connect" with red icon when wallet is not connected or wrong network', () => {
    mockSignerAddressStore.mockSetSubscribeValue("");
    mockConnectedStore.mockSetSubscribeValue(false);
    mockWrongNetworkStore.mockSetSubscribeValue(false);
    render(WalletConnect);

    const connectButton = screen.getByTestId("wallet-connect");
    expect(connectButton).toBeInTheDocument();
    expect(screen.getByTestId("not-connected")).toBeInTheDocument();
  });

  it('displays "Connected" with green icon when wallet is connected to the correct network', () => {
    mockSignerAddressStore.mockSetSubscribeValue("0x123");
    mockConnectedStore.mockSetSubscribeValue(true);
    mockWrongNetworkStore.mockSetSubscribeValue(false);

    render(WalletConnect);

    const connectButton = screen.getByTestId("wallet-connect");
    expect(connectButton).toBeInTheDocument();
    expect(screen.getByTestId("connected")).toBeInTheDocument();
  });
});

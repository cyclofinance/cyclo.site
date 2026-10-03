import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, it, expect } from "vitest";
import RewardsPlaceholder from "./RewardsPlaceholder.svelte";
import { mockSignerAddressStore } from "$lib/mocks/mockStores";

describe("RewardsPlaceholder Component", () => {
  it("should render RewardsInfo component", async () => {
    render(RewardsPlaceholder);
    expect(screen.getByTestId("rewards-placeholder")).toBeInTheDocument();
  });

  it("should show the connect message if there is no signerAddress", async () => {
    mockSignerAddressStore.mockSetSubscribeValue("");
    render(RewardsPlaceholder);
    await waitFor(() => {
      expect(screen.getByTestId("connect-message")).toBeInTheDocument();
    });
  });

  it("should carry rel=noopener noreferrer on the target=_blank docs link", () => {
    render(RewardsPlaceholder);
    const link = screen.getByText("How are rewards calculated?").closest("a");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

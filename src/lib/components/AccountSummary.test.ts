import { render, screen, waitFor } from "@testing-library/svelte";
import { vi, describe, beforeEach, it, expect, afterEach } from "vitest";
import { getAddress } from "viem";
import AccountSummary from "./AccountSummary.svelte";
import type { AccountStats } from "$lib/types";

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$lib/queries/fetchAccountStatus", () => ({
  fetchAccountStatus: vi.fn(),
}));

const mockStats: AccountStats = {
  account: "0x1234567890123456789012345678901234567890",
  eligibleBalances: {
    cysFLR: BigInt(100),
    cyWETH: BigInt(200),
  },
  shares: {
    cysFLR: {
      percentageShare: BigInt(50),
      rewardsAmount: BigInt(10),
    },
    cyWETH: {
      percentageShare: BigInt(50),
      rewardsAmount: BigInt(10),
    },
    totalRewards: BigInt(20),
  } as unknown as AccountStats["shares"],
  transfers: {
    in: [],
    out: [],
  },
  liquidityChanges: [],
};

describe("AccountSummary Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state while fetching AccountSummary", async () => {
    const { fetchAccountStatus } = await import(
      "$lib/queries/fetchAccountStatus"
    );
    vi.mocked(fetchAccountStatus).mockImplementation(
      () => new Promise(() => {}),
    );

    render(AccountSummary, {
      props: { account: "0x1234567890123456789012345678901234567890" },
    });

    await waitFor(() => {
      expect(screen.getByTestId("loader")).toBeInTheDocument();
    });
  });

  it("should display Full Tx History button", async () => {
    const { fetchAccountStatus } = await import(
      "$lib/queries/fetchAccountStatus"
    );
    vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

    render(AccountSummary, {
      props: { account: "0x1234567890123456789012345678901234567890" },
    });

    await waitFor(() => {
      expect(screen.getByText("Your Rewards")).toBeInTheDocument();
      expect(screen.getByTestId("full-tx-history-button")).toBeInTheDocument();
    });
  });

  it("should have the right url for the account page", async () => {
    const { fetchAccountStatus } = await import(
      "$lib/queries/fetchAccountStatus"
    );
    vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

    render(AccountSummary, {
      props: { account: "0x1234567890123456789012345678901234567890" },
    });

    // Wait for component to load and get button
    const link = await screen.findByTestId("full-tx-history-button");

    // Check the href attribute
    expect(link).toHaveAttribute(
      "href",
      "/rewards/0x1234567890123456789012345678901234567890",
    );
  });

  it("should show an error and not query the subgraph when account is not an address", async () => {
    const { fetchAccountStatus } = await import(
      "$lib/queries/fetchAccountStatus"
    );
    vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

    render(AccountSummary, {
      props: { account: "0xabc?redirect=evil" },
    });

    await waitFor(() => {
      expect(screen.getByText("Invalid account address")).toBeInTheDocument();
    });
    expect(fetchAccountStatus).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId("full-tx-history-button"),
    ).not.toBeInTheDocument();
  });

  it("should lowercase a checksummed account in the rewards link", async () => {
    const { fetchAccountStatus } = await import(
      "$lib/queries/fetchAccountStatus"
    );
    vi.mocked(fetchAccountStatus).mockResolvedValue(mockStats);

    const checksummed = getAddress(
      "0xfb3e7c7f15c63baae651b53bfabecec9c4c98160",
    );
    render(AccountSummary, {
      props: { account: checksummed },
    });

    const link = await screen.findByTestId("full-tx-history-button");
    expect(link).toHaveAttribute(
      "href",
      "/rewards/0xfb3e7c7f15c63baae651b53bfabecec9c4c98160",
    );
  });
});

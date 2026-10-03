import { render, screen, waitFor, within } from "@testing-library/svelte";
import Footer from "./Footer.svelte";
import { describe, it, vi, expect, beforeEach } from "vitest";

const { mockBalancesStore } = await vi.hoisted(
  () => import("$lib/mocks/mockStores"),
);

vi.mock("ethers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ethers")>();
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      ZeroAddress: "0x0000000000000000000000000000000000000000",
    },
    formatEther: vi
      .fn()
      .mockImplementation((value: bigint) => value.toString()),
    formatUnits: vi
      .fn()
      .mockImplementation((value: bigint) => value.toString()),
  };
});

vi.mock("$lib/balancesStore", async () => {
  return {
    default: mockBalancesStore,
  };
});

describe("Footer.svelte", () => {
  beforeEach(() => {
    mockBalancesStore.mockSetSubscribeValue(
      "Ready",
      false,
      {
        cyWETH: {
          lockPrice: BigInt(0),
          price: BigInt(0),
          supply: BigInt(0),
          underlyingTvl: BigInt(0),
          usdTvl: BigInt(3000),
        },
        cysFLR: {
          lockPrice: BigInt(1e18),
          price: BigInt(0),
          supply: BigInt(1e18),
          underlyingTvl: BigInt(3000),
          usdTvl: BigInt(3000),
        },
      },
      {
        cyWETH: {
          signerBalance: BigInt(200),
          signerUnderlyingBalance: BigInt(200),
        },
        cysFLR: {
          signerBalance: BigInt(100),
          signerUnderlyingBalance: BigInt(100),
        },
      },
      {
        cusdxOutput: BigInt(0),
        cyTokenOutput: BigInt(0),
      },
    );
  });

  it("should display cysFLR supply correctly", async () => {
    render(Footer);

    await waitFor(() => {
      expect(screen.getByTestId("supply")).toBeInTheDocument();
    });
  });

  it("should display TVL correctly", async () => {
    render(Footer);

    await waitFor(() => {
      expect(screen.getByTestId("tvl")).toBeInTheDocument();
      expect(screen.getByText("3000 sFLR / $ 3000")).toBeInTheDocument();
    });
  });

  it("should not display supply if fetch fails", async () => {
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

    render(Footer);

    await waitFor(() => {
      expect(screen.queryByText("Total cysFLR supply")).not.toBeInTheDocument();
      expect(screen.queryByText("Total TVL")).not.toBeInTheDocument();
    });
  });

  it("should flag price and market cap as unavailable in the error style when the price is unavailable", async () => {
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
          price: null,
          supply: BigInt(1e18),
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

    render(Footer);

    await waitFor(() => {
      const priceRow = screen
        .getByText("Current cysFLR Price")
        .closest("div") as HTMLElement;
      expect(within(priceRow).getByText("price unavailable")).toHaveClass(
        "text-red-400",
      );
      expect(within(priceRow).queryByText(/\$/)).not.toBeInTheDocument();

      const capRow = screen.getByTestId("market-cap-cysFLR") as HTMLElement;
      expect(within(capRow).getByText("price unavailable")).toHaveClass(
        "text-red-400",
      );
      expect(within(capRow).queryByText(/\$/)).not.toBeInTheDocument();

      // cyWETH's genuine zero in the same render stays unstyled.
      expect(
        within(screen.getByTestId("market-cap-cyWETH")).getByText("$ 0"),
      ).not.toHaveClass("text-red-400");
    });
  });

  it("should still display an unstyled $ 0 for a genuine zero price", async () => {
    render(Footer);

    await waitFor(() => {
      const priceRow = screen
        .getByText("Current cysFLR Price")
        .closest("div") as HTMLElement;
      expect(within(priceRow).getByText("$ 0")).not.toHaveClass("text-red-400");
      expect(
        within(priceRow).queryByText("price unavailable"),
      ).not.toBeInTheDocument();

      const capRow = screen.getByTestId("market-cap-cysFLR") as HTMLElement;
      expect(within(capRow).getByText("$ 0")).not.toHaveClass("text-red-400");
      expect(
        within(capRow).queryByText("price unavailable"),
      ).not.toBeInTheDocument();
    });
  });

  it("should display market cap correctly", async () => {
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
          price: BigInt(1e18),
          supply: BigInt(1),
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
    render(Footer);

    await waitFor(() => {
      expect(screen.getByTestId("market-cap-cysFLR")).toBeInTheDocument();
      expect(screen.getByText("$ 1000000000000")).toBeInTheDocument();
    });
  });
});

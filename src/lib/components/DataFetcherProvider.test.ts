import { render, screen } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DataFetcherProvider from "./DataFetcherProvider.svelte";
import { getAndStartDataFetcher } from "$lib/trade/prices";
import DataFetcherTest from "./DataFetcherTest.svelte";
import DataFetcherChainIdTest from "./DataFetcherChainIdTest.svelte";
import { DataFetcher } from "sushi";
import { flare, arbitrum } from "@wagmi/core/chains";
import { activeNetworkKey } from "$lib/stores";
// Mock the data fetcher module
vi.mock("$lib/trade/prices", () => ({
  getAndStartDataFetcher: vi.fn(),
}));

describe("DataFetcherProvider Component", () => {
  const mockDataFetcher = new DataFetcher(flare.id);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAndStartDataFetcher).mockResolvedValue(mockDataFetcher);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // activeNetworkKey is module-global state; reset so switches don't leak.
    activeNetworkKey.set("flare");
  });

  it("should call getAndStartDataFetcher on mount", async () => {
    render(DataFetcherProvider);

    // Wait for the next tick to allow the onMount callback to execute
    await vi.waitFor(() => {
      expect(getAndStartDataFetcher).toHaveBeenCalledTimes(1);
    });
  });

  it("should not render slot content until data fetcher is available", () => {
    render(DataFetcherTest);

    expect(screen.queryByTestId("slot-content")).not.toBeInTheDocument();
  });

  it("should render slot content when data fetcher is available", async () => {
    render(DataFetcherTest);

    // if we wait until after onMount, the slot content will be there
    await vi.waitFor(() => {
      expect(screen.getByTestId("slot-content")).toBeInTheDocument();
      expect(screen.getByTestId("slot-content")).toHaveTextContent(
        "Data Fetcher is available",
      );
    });
  });

  it("should set the data fetcher in context", async () => {
    render(DataFetcherTest);

    await vi.waitFor(() => {
      expect(screen.getByTestId("data-fetcher-available")).toBeInTheDocument();
    });
  });

  it("refetches the DataFetcher for the newly selected network on switch", async () => {
    const flareFetcher = new DataFetcher(flare.id);
    const arbitrumFetcher = new DataFetcher(arbitrum.id);
    vi.mocked(getAndStartDataFetcher).mockImplementation(
      (chainId?: number) =>
        (chainId === arbitrum.id
          ? arbitrumFetcher
          : flareFetcher) as unknown as ReturnType<
          typeof getAndStartDataFetcher
        >,
    );

    render(DataFetcherProvider);

    // Mounts against the default network (Flare).
    await vi.waitFor(() => {
      expect(getAndStartDataFetcher).toHaveBeenLastCalledWith(flare.id);
    });

    // A runtime network switch must drive a refetch for the new chain.
    activeNetworkKey.set("arbitrum");

    await vi.waitFor(() => {
      expect(getAndStartDataFetcher).toHaveBeenLastCalledWith(arbitrum.id);
    });
  });

  it("discards a stale fetcher whose network was superseded before it resolved", async () => {
    const flareFetcher = new DataFetcher(flare.id);
    const arbitrumFetcher = new DataFetcher(arbitrum.id);
    const resolvers: Record<number, (fetcher: DataFetcher) => void> = {};
    vi.mocked(getAndStartDataFetcher).mockImplementation(
      (chainId?: number) =>
        new Promise<DataFetcher>((resolve) => {
          resolvers[chainId ?? flare.id] = resolve;
        }) as unknown as ReturnType<typeof getAndStartDataFetcher>,
    );

    render(DataFetcherChainIdTest);

    // Mount requests Flare; switch to Arbitrum before Flare resolves.
    await vi.waitFor(() => expect(resolvers[flare.id]).toBeDefined());
    activeNetworkKey.set("arbitrum");
    await vi.waitFor(() => expect(resolvers[arbitrum.id]).toBeDefined());

    // Arbitrum (the current selection) resolves and is shown.
    resolvers[arbitrum.id](arbitrumFetcher);
    await vi.waitFor(() => {
      expect(screen.getByTestId("fetcher-chain-id")).toHaveTextContent(
        String(arbitrum.id),
      );
    });

    // The late Flare resolution is stale and must be discarded. Flush the
    // resolution microtask and any pending re-render via a macrotask so a
    // missing guard would have overwritten the store by the assertion.
    resolvers[flare.id](flareFetcher);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId("fetcher-chain-id")).toHaveTextContent(
      String(arbitrum.id),
    );
  });

  it("logs and clears the fetcher when the fetch for the selected network throws synchronously", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failure = new Error("Unsupported chainId: 42161");
    const flareFetcher = new DataFetcher(flare.id);
    // getAndStartDataFetcher is synchronous and throws (unsupported chain,
    // missing wagmi config, no public client) rather than rejecting.
    vi.mocked(getAndStartDataFetcher).mockImplementation((chainId?: number) => {
      if (chainId === arbitrum.id) throw failure;
      return flareFetcher as unknown as ReturnType<
        typeof getAndStartDataFetcher
      >;
    });

    render(DataFetcherChainIdTest);
    await vi.waitFor(() => {
      expect(screen.getByTestId("fetcher-chain-id")).toHaveTextContent(
        String(flare.id),
      );
    });

    // The throw must not escape the subscriber into the code that switched
    // the network, and must not surface as an unhandled rejection either.
    expect(() => activeNetworkKey.set("arbitrum")).not.toThrow();

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(String(arbitrum.id)),
        failure,
      );
      // The failed network is the current selection, so the stale Flare
      // fetcher is cleared rather than left to price against the wrong chain.
      expect(screen.queryByTestId("fetcher-chain-id")).not.toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it("clears the fetcher when the fetch for the selected network rejects", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const failure = new Error("RPC unavailable");
    const flareFetcher = new DataFetcher(flare.id);
    vi.mocked(getAndStartDataFetcher).mockImplementation(
      (chainId?: number) =>
        (chainId === arbitrum.id
          ? Promise.reject(failure)
          : flareFetcher) as unknown as ReturnType<
          typeof getAndStartDataFetcher
        >,
    );

    render(DataFetcherChainIdTest);
    await vi.waitFor(() => {
      expect(screen.getByTestId("fetcher-chain-id")).toHaveTextContent(
        String(flare.id),
      );
    });

    activeNetworkKey.set("arbitrum");

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(String(arbitrum.id)),
        failure,
      );
      expect(screen.queryByTestId("fetcher-chain-id")).not.toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it("keeps the current fetcher when a superseded network's fetch fails late", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const arbitrumFetcher = new DataFetcher(arbitrum.id);
    const rejecters: Record<number, (error: Error) => void> = {};
    const resolvers: Record<number, (fetcher: DataFetcher) => void> = {};
    vi.mocked(getAndStartDataFetcher).mockImplementation(
      (chainId?: number) =>
        new Promise<DataFetcher>((resolve, reject) => {
          resolvers[chainId ?? flare.id] = resolve;
          rejecters[chainId ?? flare.id] = reject;
        }) as unknown as ReturnType<typeof getAndStartDataFetcher>,
    );

    render(DataFetcherChainIdTest);

    // Mount requests Flare; switch to Arbitrum before Flare settles.
    await vi.waitFor(() => expect(rejecters[flare.id]).toBeDefined());
    activeNetworkKey.set("arbitrum");
    await vi.waitFor(() => expect(resolvers[arbitrum.id]).toBeDefined());

    resolvers[arbitrum.id](arbitrumFetcher);
    await vi.waitFor(() => {
      expect(screen.getByTestId("fetcher-chain-id")).toHaveTextContent(
        String(arbitrum.id),
      );
    });

    // The superseded Flare fetch fails late: it is logged, but clearing the
    // store here would blank the fetcher the user's current network needs.
    rejecters[flare.id](new Error("late Flare failure"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId("fetcher-chain-id")).toHaveTextContent(
      String(arbitrum.id),
    );

    consoleError.mockRestore();
  });
});

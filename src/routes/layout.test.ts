import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/svelte";
import Layout from "./+layout.svelte";
import blockNumberStore from "$lib/blockNumberStore";
import balancesStore from "$lib/balancesStore";

vi.mock("$app/environment", () => ({ browser: true }));

vi.mock("svelte-wagmi", async () => {
  const { writable } = await import("svelte/store");
  return {
    defaultConfig: vi.fn(() => ({
      init: vi.fn().mockResolvedValue(undefined),
    })),
    wagmiConfig: writable(undefined),
    chainId: writable(undefined),
    signerAddress: writable(undefined),
    connected: writable(false),
    web3Modal: writable(null),
  };
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("+layout price and balance polling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    vi.spyOn(balancesStore, "refreshPrices").mockResolvedValue(undefined);
    vi.spyOn(balancesStore, "refreshFooterStats").mockResolvedValue(undefined);
    vi.spyOn(balancesStore, "refreshBalances").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("a failed block number poll is not an unhandled rejection", async () => {
    vi.spyOn(blockNumberStore, "refresh").mockRejectedValue(
      new Error("rpc down"),
    );
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      render(Layout);
      // initWallet awaits erckit.init() before starting the interval.
      await flush();
      vi.advanceTimersByTime(10_000);
      expect(blockNumberStore.refresh).toHaveBeenCalledTimes(1);
      await flush();
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});

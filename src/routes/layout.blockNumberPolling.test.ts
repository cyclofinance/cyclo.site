import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { render } from "@testing-library/svelte";
import Layout from "./+layout.svelte";
import blockNumberStore from "$lib/blockNumberStore";

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$env/static/public", () => ({
  PUBLIC_WALLETCONNECT_ID: "test-walletconnect-id",
}));

vi.mock("svelte-wagmi", async () => {
  const { writable } = await import("svelte/store");
  return {
    defaultConfig: vi.fn(() => ({
      init: vi.fn().mockResolvedValue(undefined),
    })),
    wagmiConfig: writable({}),
    signerAddress: writable(""),
    chainId: writable(null),
    connected: writable(false),
    web3Modal: writable(null),
  };
});

vi.mock("@wagmi/connectors", () => ({
  injected: vi.fn(),
  walletConnect: vi.fn(),
}));

vi.mock("$lib/components/Header.svelte", async () => ({
  default: (await import("$lib/test/DummySlot.svelte")).default,
}));

vi.mock("$lib/components/DataFetcherProvider.svelte", async () => ({
  default: (await import("$lib/test/DummySlot.svelte")).default,
}));

vi.mock("$lib/blockNumberStore", async () => {
  const { writable } = await import("svelte/store");
  const { subscribe } = writable({
    blockNumber: BigInt(0),
    status: "Checking",
  });
  return {
    default: {
      subscribe,
      reset: vi.fn(),
      refresh: vi.fn(),
    },
  };
});

vi.mock("$lib/balancesStore", async () => {
  const { writable } = await import("svelte/store");
  const { subscribe } = writable({});
  return {
    default: {
      subscribe,
      refreshPrices: vi.fn().mockResolvedValue(undefined),
      refreshFooterStats: vi.fn().mockResolvedValue(undefined),
      refreshBalances: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe("root layout block number polling", () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };

  beforeEach(() => {
    unhandled.length = 0;
    process.on("unhandledRejection", onUnhandled);
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    process.removeListener("unhandledRejection", onUnhandled);
  });

  it("swallows blockNumberStore.refresh rejections in the polling loop", async () => {
    (blockNumberStore.refresh as Mock).mockRejectedValue(new Error("rpc down"));

    render(Layout);

    // initWallet awaits erckit.init() before starting the polling interval;
    // flush those microtasks, then advance to the first poll tick.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(10000);

    expect(blockNumberStore.refresh).toHaveBeenCalledTimes(1);

    // Give the runtime a real macrotask checkpoint so any rejection left
    // unhandled by the layout would fire the unhandledRejection hook.
    vi.useRealTimers();
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(unhandled).toEqual([]);
  });
});

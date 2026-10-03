import { vi, it, expect, beforeEach, describe } from "vitest";
import { refreshAllReceipts } from "./refreshAllReceipts";

const { mockTokens, mockNetworkConfig } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable } = require("svelte/store");
  const tokens = writable([]);
  const selectedNetwork = writable({
    chain: { id: 14 },
    cycloSubgraphUrl: "http://mocked-subgraph-url",
  });
  return { mockTokens: tokens, mockNetworkConfig: selectedNetwork };
});

vi.mock("$lib/stores", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable } = require("svelte/store");
  return {
    myReceipts: writable([]),
    tokens: mockTokens,
    selectedNetwork: mockNetworkConfig,
  };
});

vi.mock("$lib/queries/getReceipts", () => ({
  getSingleTokenReceipts: vi.fn(),
}));

global.fetch = vi.fn();

// eslint-disable-next-line
let loading = true;
const setLoading = (_loading: boolean) => {
  loading = _loading;
};

describe("refreshAllReceipts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array if signerAddress is not provided", async () => {
    const result = await refreshAllReceipts("", setLoading);
    expect(result).toEqual([]);
  });
});

describe("refreshAllReceipts subgraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts the AccountReceipts query to the network's cycloSubgraphUrl", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ data: { account: { receiptBalances: [] } } }),
    } as unknown as Response);
    mockTokens.set([
      {
        name: "cysFLR",
        receiptAddress: "0xd387fc43e19a63036d8fced559e81f5ddef7ef09",
      },
    ]);

    const result = await refreshAllReceipts("0xABC", setLoading);

    expect(result).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe(
      "http://mocked-subgraph-url",
    );
    const body = JSON.parse(
      vi.mocked(global.fetch).mock.calls[0][1]?.body as string,
    );
    expect(body.query).toContain("query AccountReceipts");
    expect(body.variables).toEqual({ account: "0xabc", first: 1000, skip: 0 });
  });
});

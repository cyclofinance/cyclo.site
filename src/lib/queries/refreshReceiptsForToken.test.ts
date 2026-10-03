import { vi, it, expect, beforeEach, describe } from "vitest";
import { get } from "svelte/store";
import { refreshReceiptsForToken } from "./refreshReceiptsForToken";
import { myReceipts } from "$lib/stores";

const SUBGRAPH_URL = "http://mocked-cyclo-subgraph";
const RECEIPT_ADDRESS = "0xd387fc43e19a63036d8fced559e81f5ddef7ef09";

vi.mock("$lib/stores", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable } = require("svelte/store");
  return {
    myReceipts: writable([]),
    tokens: writable([
      {
        name: "cysFLR",
        receiptAddress: "0xd387fc43e19a63036d8fced559e81f5ddef7ef09",
      },
      {
        name: "cyWETH",
        receiptAddress: "0xbe2615a0fcb54a49a1eb472be30d992599fe0968",
      },
    ]),
    selectedNetwork: writable({
      key: "flare",
      chain: { id: 14 },
      cycloSubgraphUrl: "http://mocked-cyclo-subgraph",
    }),
  };
});

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("refreshReceiptsForToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    myReceipts.set([]);
  });

  it("posts the AccountReceipts query to the network's cycloSubgraphUrl and keeps only the selected token's receipts", async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        data: {
          account: {
            receiptBalances: [
              {
                receiptAddress: RECEIPT_ADDRESS,
                balance: "5",
                id: "a",
                tokenId: "7",
              },
              {
                receiptAddress: "0xbe2615a0fcb54a49a1eb472be30d992599fe0968",
                balance: "9",
                id: "b",
                tokenId: "8",
              },
            ],
          },
        },
      }),
    });

    const receipts = await refreshReceiptsForToken("0xABC", "cysFLR");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(SUBGRAPH_URL);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toContain("query AccountReceipts");
    expect(body.variables).toEqual({ account: "0xabc", first: 1000, skip: 0 });
    expect(receipts).toEqual([
      {
        chainId: "14",
        tokenAddress: RECEIPT_ADDRESS,
        tokenId: "7",
        balance: 5n,
        token: "cysFLR",
      },
    ]);
    expect(get(myReceipts)).toEqual(receipts);
  });

  it("returns [] without fetching when no signer is given", async () => {
    expect(await refreshReceiptsForToken("", "cysFLR")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

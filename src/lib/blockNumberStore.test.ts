import { describe, it, expect, vi, beforeEach } from "vitest";
import { get } from "svelte/store";
import blockNumberStore from "./blockNumberStore";
import { getBlock } from "@wagmi/core";
import type { Mock } from "vitest";

vi.mock("@wagmi/core", () => ({
  getBlock: vi.fn(),
}));

describe("blockNumberStore", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockConfig = {} as any;

  beforeEach(() => {
    vi.resetAllMocks();
    blockNumberStore.reset();
  });

  it("should refresh block number correctly", async () => {
    const mockBlockNumber = BigInt(1000);
    (getBlock as Mock).mockResolvedValue({ number: mockBlockNumber });

    await blockNumberStore.refresh(mockConfig);

    const store = get(blockNumberStore);
    expect(store.blockNumber).toBe(mockBlockNumber);
    expect(store.status).toBe("Ready");
  });

  it("should handle errors", async () => {
    (getBlock as Mock).mockRejectedValue(new Error("Failed to get block"));

    await expect(blockNumberStore.refresh(mockConfig)).rejects.toThrow();

    const store = get(blockNumberStore);
    expect(store.status).toBe("Error");
  });

  it("rejects and sets Error status when RPC returns block.number=0n", async () => {
    (getBlock as Mock).mockResolvedValue({ number: BigInt(0) });

    await expect(blockNumberStore.refresh(mockConfig)).rejects.toThrow(
      "Invalid block number from RPC: 0"
    );

    const store = get(blockNumberStore);
    expect(store.status).toBe("Error");
    expect(store.blockNumber).toBe(BigInt(0));
  });

  it("rejects and sets Error status when RPC returns block.number=null", async () => {
    (getBlock as Mock).mockResolvedValue({ number: null });

    await expect(blockNumberStore.refresh(mockConfig)).rejects.toThrow(
      "Invalid block number from RPC: null"
    );

    const store = get(blockNumberStore);
    expect(store.status).toBe("Error");
  });
});

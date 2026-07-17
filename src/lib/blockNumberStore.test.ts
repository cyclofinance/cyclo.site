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

  it("stale in-flight response does not overwrite a newer result", async () => {
    let resolveSlow!: (v: { number: bigint }) => void;
    const slowPromise = new Promise<{ number: bigint }>((res) => {
      resolveSlow = res;
    });
    (getBlock as Mock)
      .mockReturnValueOnce(slowPromise)
      .mockResolvedValueOnce({ number: BigInt(2000) });

    // Start slow request (token=1)
    const slowCall = blockNumberStore.refresh(mockConfig);
    // Start fast request (token=2) — this is now the latest
    await blockNumberStore.refresh(mockConfig);

    expect(get(blockNumberStore).blockNumber).toBe(BigInt(2000));

    // Resolve the stale slow request (token=1) — must be discarded
    resolveSlow({ number: BigInt(1000) });
    await slowCall;

    // Store must still reflect the fast request's result
    expect(get(blockNumberStore).blockNumber).toBe(BigInt(2000));
    expect(get(blockNumberStore).status).toBe("Ready");
  });

  it("reset() invalidates an in-flight refresh", async () => {
    let resolveSlow!: (v: { number: bigint }) => void;
    const slowPromise = new Promise<{ number: bigint }>((res) => {
      resolveSlow = res;
    });
    (getBlock as Mock).mockReturnValueOnce(slowPromise);

    // Start a refresh that stays in flight
    const slowCall = blockNumberStore.refresh(mockConfig);

    // Reset while the request is still pending
    blockNumberStore.reset();

    // Resolve the stale request — it must not clobber the reset state
    resolveSlow({ number: BigInt(1000) });
    await slowCall;

    const store = get(blockNumberStore);
    expect(store.blockNumber).toBe(BigInt(0));
    expect(store.status).toBe("Checking");
  });

  it("non-monotonic block number does not clobber a higher block", async () => {
    (getBlock as Mock)
      .mockResolvedValueOnce({ number: BigInt(5000) })
      .mockResolvedValueOnce({ number: BigInt(4999) });

    await blockNumberStore.refresh(mockConfig);
    await blockNumberStore.refresh(mockConfig);

    expect(get(blockNumberStore).blockNumber).toBe(BigInt(5000));
  });
});

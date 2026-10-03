import { writable } from "svelte/store";
import { getBlock } from "@wagmi/core";
import type { Config } from "@wagmi/core";

const initialState = {
  blockNumber: BigInt(0),
  chainId: null as number | null,
  status: "Checking" as "Checking" | "Ready" | "Error",
};

const blockNumberStore = () => {
  const { subscribe, set, update } = writable(initialState);
  let inflightToken = 0;
  const reset = () => {
    // Invalidate any in-flight refresh so a late response cannot
    // overwrite the freshly reset state.
    inflightToken++;
    set(initialState);
  };

  const refresh = async (config: Config) => {
    const token = ++inflightToken;
    const chainId = config.state.chainId;
    try {
      const block = await getBlock(config);
      if (block.number === null || block.number <= 0n) {
        throw new Error(`Invalid block number from RPC: ${block.number}`);
      }
      if (token !== inflightToken) return block.number as bigint;
      update((state) => {
        const blockNumber = block.number as bigint;
        // Monotonicity only means something within one chain; a block
        // observed on a different chain replaces the stored one outright.
        const sameChain = state.chainId === chainId;
        return {
          ...state,
          chainId,
          blockNumber:
            sameChain && blockNumber <= state.blockNumber
              ? state.blockNumber
              : blockNumber,
          status: "Ready",
        };
      });
      return block.number as bigint;
    } catch (error) {
      if (token !== inflightToken) throw error;
      console.error("Error getting block number:", error);
      update((state) => ({
        ...state,
        status: "Error",
      }));
      throw error;
    }
  };

  return {
    subscribe,
    reset,
    refresh,
  };
};

export default blockNumberStore();

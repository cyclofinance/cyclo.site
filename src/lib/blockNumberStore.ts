import { writable } from "svelte/store";
import { getBlock } from "@wagmi/core";
import type { Config } from "@wagmi/core";

const initialState = {
  blockNumber: BigInt(0),
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
    try {
      const block = await getBlock(config);
      if (token !== inflightToken) return block.number;
      update((state) => ({
        ...state,
        blockNumber:
          block.number > state.blockNumber ? block.number : state.blockNumber,
        status: "Ready",
      }));
      return block.number;
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

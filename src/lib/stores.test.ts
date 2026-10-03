import { describe, it, expect, vi } from "vitest";

vi.mock("svelte-wagmi", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable } = require("svelte/store");
  return { chainId: writable(undefined), signerAddress: writable(undefined) };
});

import { supportedNetworks } from "./stores";
import { FLARE_CYCLO_SUBGRAPH_URL } from "./subgraph-urls";

describe("network cyclo subgraph urls", () => {
  it("flare reads receipts from FLARE_CYCLO_SUBGRAPH_URL", () => {
    const flare = supportedNetworks.find((n) => n.key === "flare");
    expect(flare?.cycloSubgraphUrl).toBe(FLARE_CYCLO_SUBGRAPH_URL);
    expect(FLARE_CYCLO_SUBGRAPH_URL).toMatch(/^https:\/\/.+\/cyclo-flare\//);
  });

  it("arbitrum reads receipts from the cyclo-arbitrum-one subgraph", () => {
    const arbitrum = supportedNetworks.find((n) => n.key === "arbitrum");
    expect(arbitrum?.cycloSubgraphUrl).toMatch(
      /^https:\/\/.+\/cyclo-arbitrum-one\//,
    );
  });
});

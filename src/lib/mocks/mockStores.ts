import { writable } from "svelte/store";

import { type Config } from "@wagmi/core";
import { flare } from "@wagmi/core/chains";
import type { Hex } from "viem";
import { mockWeb3Config } from "./mockWagmiConfig";
import type { CyToken, Receipt } from "$lib/types";

// Default cysFLR-shaped token for the mock selectedCyToken writable. Tests
// that don't override get this value, matching the production default in
// stores.ts. Tests that need a different shape call
// mockSelectedCyToken.mockSetSubscribeValue(custom).
export const DEFAULT_SELECTED_CYTOKEN: CyToken = {
  name: "cysFLR",
  symbol: "cysFLR",
  decimals: 18,
  underlyingDecimals: 18,
  address: "0x19831cfb53a0dbead9866c43557c1d48dff76567" as Hex,
  underlyingAddress: "0x12e605bc104e93b45e1ad99f9e555f659051c2bb" as Hex,
  underlyingSymbol: "sFLR",
  receiptAddress: "0xd387fc43e19a63036d8fced559e81f5ddef7ef09" as Hex,
  chainId: flare.id,
  networkName: "Flare",
  active: true,
};

// Mock writable stores
export const web3ModalStore = writable<{ open: () => void } | null>({
  open: () => {},
});
const mockWrongNetworkWritable = writable<boolean>(false);
const mockSignerAddressWritable = writable<string>("");
const mockChainIdWritable = writable<number>(0);
const mockPageWritable = writable({ url: { pathname: "/" } });
const mockConnectedWritable = writable<boolean>(false);
const mockWagmiConfigWritable = writable<Config>(mockWeb3Config);
const erc1155AddressWritable = writable<Hex>(
  "0x6D6111ab02800aC64f66456874add77F44529a90",
);
const mockCysFlrAddressWritable = writable<Hex>(
  "0x91e3B9820b47c7D4e6765E90F94C1638E7bc53C6",
);
const mockSFlrAddressWritable = writable<Hex>(
  "0x91e3B9820b47c7D4e6765E90F94C163123456789",
);
const mockMyReceiptsWritable = writable<Receipt[]>([]);
const mockSelectedCyTokenWritable = writable<CyToken>(DEFAULT_SELECTED_CYTOKEN);

type BalanceData = {
  signerBalance: bigint;
  signerUnderlyingBalance: bigint;
};

type StatsData = {
  lockPrice: bigint;
  price: bigint;
  supply: bigint;
  underlyingTvl: bigint;
  usdTvl: bigint;
};

type SwapQuotes = {
  cusdxOutput: bigint;
  cyTokenOutput: bigint;
};

type Balances = {
  cyWETH: BalanceData;
  cysFLR: BalanceData;
};

type Stats = {
  cyWETH: StatsData;
  cysFLR: StatsData;
};

type MockBalances = {
  balances: Balances;
  stats: Stats;
  statsLoading: boolean;
  status: string;
  swapQuotes: SwapQuotes;
};

const mockBalancesWritable = writable<MockBalances>({
  balances: {
    cyWETH: {
      signerBalance: BigInt(100),
      signerUnderlyingBalance: BigInt(100),
    },
    cysFLR: {
      signerBalance: BigInt(100),
      signerUnderlyingBalance: BigInt(100),
    },
  },
  stats: {
    cyWETH: {
      lockPrice: BigInt(1),
      price: BigInt(1),
      supply: BigInt(1000000),
      underlyingTvl: BigInt(1000),
      usdTvl: BigInt(1000),
    },
    cysFLR: {
      lockPrice: BigInt(1),
      price: BigInt(1),
      supply: BigInt(1000000),
      underlyingTvl: BigInt(1000),
      usdTvl: BigInt(1000),
    },
  },
  statsLoading: true,
  status: "Checking",
  swapQuotes: {
    cusdxOutput: BigInt(0),
    cyTokenOutput: BigInt(0),
  },
});

export const mockBalancesStore = {
  subscribe: mockBalancesWritable.subscribe,
  set: mockBalancesWritable.set,
  mockSetSubscribeValue: (
    status: string,
    statsLoading: boolean,
    stats: Stats,
    balances: Balances,
    swapQuotes: SwapQuotes,
  ): void => {
    mockBalancesWritable.set({
      status,
      statsLoading,
      stats,
      balances,
      swapQuotes,
    });
  },
};

export const mockWrongNetworkStore = {
  subscribe: mockWrongNetworkWritable.subscribe,
  set: mockWrongNetworkWritable.set,
  mockSetSubscribeValue: (value: boolean): void =>
    mockWrongNetworkWritable.set(value),
};

export const mockSignerAddressStore = {
  subscribe: mockSignerAddressWritable.subscribe,
  set: mockSignerAddressWritable.set,
  mockSetSubscribeValue: (value: string): void =>
    mockSignerAddressWritable.set(value),
};

export const mockChainIdStore = {
  subscribe: mockChainIdWritable.subscribe,
  set: mockChainIdWritable.set,
  mockSetSubscribeValue: (value: number): void =>
    mockChainIdWritable.set(value),
};

export const mockPageStore = {
  subscribe: mockPageWritable.subscribe,
  set: mockPageWritable.set,
  mockSetSubscribeValue: (value: { url: { pathname: string } }): void =>
    mockPageWritable.set(value),
};

export const mockConnectedStore = {
  subscribe: mockConnectedWritable.subscribe,
  set: mockConnectedWritable.set,
  mockSetSubscribeValue: (value: boolean): void =>
    mockConnectedWritable.set(value),
};

export const mockWagmiConfigStore = {
  subscribe: mockWagmiConfigWritable.subscribe,
  set: mockWagmiConfigWritable.set,
  mockSetSubscribeValue: (value: Config): void =>
    mockWagmiConfigWritable.set(value),
};

export const mockErc1155AddressStore = {
  subscribe: erc1155AddressWritable.subscribe,
  set: erc1155AddressWritable.set,
  mockSetSubscribeValue: (value: Hex): void =>
    erc1155AddressWritable.set(value),
};

export const mockCysFlrAddressStore = {
  subscribe: mockCysFlrAddressWritable.subscribe,
  set: mockCysFlrAddressWritable.set,
  mockSetSubscribeValue: (value: Hex): void =>
    mockCysFlrAddressWritable.set(value),
};

export const mockSflrAddressStore = {
  subscribe: mockSFlrAddressWritable.subscribe,
  set: mockSFlrAddressWritable.set,
  mockSetSubscribeValue: (value: Hex): void =>
    mockSFlrAddressWritable.set(value),
};

export const mockMyReceipts = {
  subscribe: mockMyReceiptsWritable.subscribe,
  set: mockMyReceiptsWritable.set,
  mockSetSubscribeValue: (value: Receipt[]): void =>
    mockMyReceiptsWritable.set(value),
};

export const mockSelectedCyToken = {
  subscribe: mockSelectedCyTokenWritable.subscribe,
  set: mockSelectedCyTokenWritable.set,
  mockSetSubscribeValue: (value: CyToken): void =>
    mockSelectedCyTokenWritable.set(value),
};

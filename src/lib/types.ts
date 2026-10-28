import type { Config } from "@wagmi/core";
import { type Hex } from "viem";

export type Receipt = {
  chainId: string;
  tokenAddress: Hex;
  tokenId: string;
  balance: bigint;
  readableTokenId?: string;
  readableTotalsFlr?: string;
  readableFlrPerReceipt?: string;
  totalsFlr?: bigint;
  token?: string;
};

export type BlockScoutData = {
  token: {
    address_hash: string;
  };
  value: string;
  id: string;
};

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  address: Hex;
}

export interface CyToken extends Token {
  name: string;
  address: Hex;
  // The vault share token's decimals (inherited from Token.decimals).
  // The vault wraps an underlying with its own decimals — formatting
  // underlying balances or parsing user input as underlying must use
  // underlyingDecimals, not decimals.
  underlyingAddress: Hex;
  underlyingSymbol: string;
  underlyingDecimals: number;
  receiptAddress: Hex;
  chainId: number;
  networkName: string;
  active: boolean;
}

export type InitiateLockTransactionArgs = {
  signerAddress: string;
  config: Config;
  selectedToken: CyToken;
  assets: bigint;
};

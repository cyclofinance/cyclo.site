import type { Config } from '@wagmi/core';
import { type Hex } from 'viem';

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
		address: string;
	};
	value: string;
	id: string;
};

export interface CyToken {
	name: string;
	address: Hex;
	underlyingAddress: Hex;
	underlyingSymbol: string;
	receiptAddress: Hex;
}

export type InitiateLockTransactionArgs = {
	signerAddress: string;
	config: Config;
	selectedToken: CyToken;
	assets: bigint;
};

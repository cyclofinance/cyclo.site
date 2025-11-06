import type { Config } from '@wagmi/core';
import { type Hex } from 'viem';
import type { AccountStatusQuery } from '../generated-graphql';

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

export type RewardsPools = {
	cysFlr: bigint;
	cyWeth: bigint;
	cyFxrp: bigint;
};

export type Share = {
	percentageShare: bigint;
	rewardsAmount: bigint;
};

export type Shares = {
	cysFLR: Share;
	cyWETH: Share;
	cyFXRP: Share;
	totalRewards: bigint;
};

export type AccountStats = {
	account: Hex;
	eligibleBalances: {
		cysFLR: bigint;
		cyWETH: bigint;
		cyFXRP: bigint;
	};
	shares: Shares;
	transfers: {
		in: NonNullable<AccountStatusQuery['account']>['transfersIn'];
		out: NonNullable<AccountStatusQuery['account']>['transfersOut'];
	};
};

export type LeaderboardEntry = Omit<AccountStats, 'transfers'>;

export type GlobalStats = {
	eligibleHolders: number;
	totalEligibleCysFLR: bigint;
	totalEligibleCyWETH: bigint;
	totalEligibleCyFXRP: bigint;
	totalEligibleSum: bigint;
	rewardsPools: RewardsPools;
	cysFLRApy: bigint;
	cyWETHApy: bigint;
	cyFXRPApy: bigint;
};

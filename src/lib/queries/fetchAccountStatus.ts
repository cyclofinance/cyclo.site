import { type AccountStatusQuery } from '../../generated-graphql';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import { formatEther } from 'ethers';
import { SUBGRAPH_URL } from '$lib/constants';
import { type Hex } from 'viem';

export type AccountStats = {
	netTransfers: {
		cysFLR: string;
		cyWETH: string;
	};
	percentage: number;
	proRataReward: number;
	transfers: {
		in: Array<{
			fromIsApprovedSource: boolean;
			transactionHash: string;
			from: { id: string };
			to: { id: string };
			value: string;
			blockTimestamp: string;
			tokenAddress: Hex;
		}>;
		out: Array<{
			fromIsApprovedSource: boolean;
			transactionHash: string;
			from: { id: string };
			to: { id: string };
			value: string;
			blockTimestamp: string;
			tokenAddress: Hex;
		}>;
	};
};

const TOTAL_REWARD = 1_000_000; // 1M rFLR

export async function fetchAccountStatus(account: string): Promise<AccountStats> {
	const response = await fetch(SUBGRAPH_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: AccountStatus,
			variables: { account }
		})
	});
	const data: AccountStatusQuery = (await response.json()).data;

	const percentage = Number(data.account?.eligibleShare ?? 0) * 100;

	return {
		netTransfers: {
			cysFLR: formatEther(data.account?.cysFLRBalance ?? 0),
			cyWETH: formatEther(data.account?.cyWETHBalance ?? 0)
		},
		percentage,
		proRataReward: percentage * (TOTAL_REWARD / 100),
		transfers: {
			in: data.account?.transfersIn ?? [],
			out: data.account?.transfersOut ?? []
		}
	};
}

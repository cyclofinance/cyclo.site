import { type AccountStatusQuery } from '../../generated-graphql';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import { formatEther } from 'ethers';
import { SUBGRAPH_URL, TOTAL_REWARD } from '$lib/constants';
import type { AccountStats } from '$lib/types';

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

	const sharePercentage =
		(data.account?.totalCyBalance / data.eligibleTotals?.totalEligibleSum) * 100;

	return {
		netTransfers: {
			cysFLR: formatEther(data.account?.cysFLRBalance ?? 0),
			cyWETH: formatEther(data.account?.cyWETHBalance ?? 0)
		},
		percentage: sharePercentage,
		proRataReward: sharePercentage * TOTAL_REWARD,
		transfers: {
			in: data.account?.transfersIn ?? [],
			out: data.account?.transfersOut ?? []
		}
	};
}

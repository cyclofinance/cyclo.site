import { type AccountStatusQuery } from '../../generated-graphql';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import type { AccountStats } from '$lib/types';
import { get } from 'svelte/store';
import { rewardsSubgraphUrl } from '$lib/stores';
import { calculateShares } from './calculateShares';
import { isHex } from 'viem';

export async function fetchAccountStatus(account: string): Promise<AccountStats> {
	if (!isHex(account)) throw 'Invalid account';

	const rewardsSg = get(rewardsSubgraphUrl);
	const response = await fetch(rewardsSg, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: AccountStatus,
			variables: { account }
		})
	});
	const data: AccountStatusQuery = (await response.json()).data;

	const accountData = data.account as {
		cysFLRBalance: string;
		cyWETHBalance: string;
		cyFXRPBalance?: string;
		cyWBTCBalance?: string;
		cycbBTCBalance?: string;
		totalCyBalance: string;
		transfersIn: NonNullable<AccountStatusQuery['account']>['transfersIn'];
		transfersOut: NonNullable<AccountStatusQuery['account']>['transfersOut'];
	} | null;

	if (!accountData) throw 'No account';

	const eligibleTotals = data.eligibleTotals as {
		totalEligibleCysFLR?: string;
		totalEligibleCyWETH?: string;
		totalEligibleCyFXRP?: string;
		totalEligibleCyWBTC?: string;
		totalEligibleCycbBTC?: string;
		totalEligibleSum?: string;
	} | null;

	if (!eligibleTotals) throw 'No eligible totals';

	const shares = calculateShares(accountData, eligibleTotals);

	return {
		account,
		eligibleBalances: {
			cysFLR: BigInt(accountData.cysFLRBalance),
			cyWETH: BigInt(accountData.cyWETHBalance),
			cyFXRP: BigInt(accountData.cyFXRPBalance || 0),
			cyWBTC: BigInt(accountData.cyWBTCBalance || 0),
			cycbBTC: BigInt(accountData.cycbBTCBalance || 0)
		},
		shares,
		transfers: {
			in: accountData.transfersIn,
			out: accountData.transfersOut
		}
	};
}

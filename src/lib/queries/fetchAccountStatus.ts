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

	const accountData = data.account;
	if (!accountData) throw 'No account';

	const eligibleTotals = data.eligibleTotals;
	if (!eligibleTotals) throw 'No eligible totals';

	const shares = calculateShares(accountData, eligibleTotals);

	return {
		account,
		eligibleBalances: {
			cysFLR: BigInt(accountData.cysFLRBalance),
			cyWETH: BigInt(accountData.cyWETHBalance),
			cyFXRP: BigInt(accountData.cyFXRPBalance || 0)
		},
		shares,
		transfers: {
			in: accountData.transfersIn,
			out: accountData.transfersOut
		}
	};
}

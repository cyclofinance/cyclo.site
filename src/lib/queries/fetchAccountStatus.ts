import { type AccountStatusQuery } from '../../generated-graphql';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import type { AccountStats } from '$lib/types';
import { calculateShares } from './calculateShares';
import { extractBalancesFromVaults } from './vaultUtils';
import { isHex } from 'viem';
import { get } from 'svelte/store';
import { selectedNetwork } from '$lib/stores';

export async function fetchAccountStatus(account: string): Promise<AccountStats> {
	if (!isHex(account)) throw 'Invalid account';

	const subgraphUrl = get(selectedNetwork).rewardsSubgraphUrl;
	const response = await fetch(subgraphUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: AccountStatus,
			variables: { account }
		})
	});
	const { data, errors } = (await response.json()) as {
		data?: AccountStatusQuery;
		errors?: { message: string }[];
	};

	if (errors?.length) {
		throw new Error(`GraphQL errors: ${errors.map((e) => e.message).join(', ')}`);
	}

	if (!data) {
		throw new Error('No data returned from query');
	}

	const accountData = data.account;
	if (!accountData) throw 'No account';

	const eligibleTotals = data.eligibleTotals;
	if (!eligibleTotals) throw 'No eligible totals';

	const shares = calculateShares(accountData, eligibleTotals, data.cycloVaults);
	const balances = extractBalancesFromVaults(accountData.vaultBalances);

	return {
		account,
		eligibleBalances: balances,
		shares,
		transfers: {
			in: accountData.transfersIn,
			out: accountData.transfersOut
		},
		liquidityChanges: accountData.liquidityChanges
	};
}

import { type AccountStatusQuery } from '../../generated-graphql';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import { SUBGRAPH_URL } from '$lib/constants';
import type { AccountStats } from '$lib/types';
import { calculateShares } from './calculateShares';
import { isHex } from 'viem';
import { get } from 'svelte/store';
import { tokens } from '$lib/stores';
import { isAddressEqual } from 'viem';

/**
 * Extract token balances from vaultBalances array
 */
function extractBalancesFromVaults(
	vaultBalances: NonNullable<AccountStatusQuery['account']>['vaultBalances']
): { cysFLR: bigint; cyWETH: bigint } {
	const currentTokens = get(tokens);
	const balances = { cysFLR: 0n, cyWETH: 0n };

	if (!vaultBalances) return balances;

	for (const vaultBalance of vaultBalances) {
		const vaultAddress = vaultBalance.vault?.address;
		if (!vaultAddress) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			if (token.symbol === 'cysFLR') {
				balances.cysFLR = BigInt(vaultBalance.balance || '0');
			} else if (token.symbol === 'cyWETH') {
				balances.cyWETH = BigInt(vaultBalance.balance || '0');
			}
		}
	}

	return balances;
}

export async function fetchAccountStatus(account: string): Promise<AccountStats> {
	if (!isHex(account)) throw 'Invalid account';

	const response = await fetch(SUBGRAPH_URL, {
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

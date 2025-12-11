import { type AccountStatusQuery } from '../../generated-graphql';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import type { AccountStats } from '$lib/types';
import { calculateShares } from './calculateShares';
import { isHex } from 'viem';
import { get } from 'svelte/store';
import { tokens, selectedNetwork } from '$lib/stores';
import { isAddressEqual } from 'viem';

/**
 * Extract token balances from vaultBalances array
 */
function extractBalancesFromVaults(
	vaultBalances: NonNullable<AccountStatusQuery['account']>['vaultBalances']
): Record<string, bigint> {
	const currentTokens = get(tokens);
	const balances: Record<string, bigint> = {};

	if (!vaultBalances) return balances;

	for (const vaultBalance of vaultBalances) {
		const vaultAddress = vaultBalance.vault?.address;
		if (!vaultAddress) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			balances[token.symbol] = BigInt(vaultBalance.balance || '0');
		}
	}

	// Ensure all tokens have a balance entry (even if 0)
	for (const token of currentTokens) {
		if (!(token.symbol in balances)) {
			balances[token.symbol] = 0n;
		}
	}

	return balances;
}

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

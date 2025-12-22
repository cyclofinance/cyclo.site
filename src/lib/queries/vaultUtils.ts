import { get } from 'svelte/store';
import { tokens } from '$lib/stores';
import { isAddressEqual } from 'viem';
import type { AccountStatusQuery, TopAccountsQuery, StatsQuery } from '../../generated-graphql';

/**
 * Extract token balances from vaultBalances array
 * Works with both AccountStatusQuery and TopAccountsQuery vault balances
 */
export function extractBalancesFromVaults(
	vaultBalances:
		| NonNullable<AccountStatusQuery['account']>['vaultBalances']
		| NonNullable<TopAccountsQuery['accountsByCyBalance']>[0]['vaultBalances']
): Record<string, bigint> {
	const currentTokens = get(tokens);
	const balances: Record<string, bigint> = {};

	if (!vaultBalances) {
		// Initialize with zeros for all tokens
		for (const token of currentTokens) {
			balances[token.symbol] = 0n;
		}
		return balances;
	}

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

/**
 * Aggregate total eligible amounts from cycloVaults by token symbol
 * Works with both StatsQuery and AccountStatusQuery cycloVaults
 */
export function aggregateTotalEligibleFromVaults(
	cycloVaults?: StatsQuery['cycloVaults'] | AccountStatusQuery['cycloVaults']
): Record<string, bigint> {
	const currentTokens = get(tokens);
	const totals: Record<string, bigint> = {};

	if (!cycloVaults) {
		// Initialize with zeros for all tokens
		for (const token of currentTokens) {
			totals[token.symbol] = 0n;
		}
		return totals;
	}

	// Aggregate totals from cycloVaults by token symbol
	for (const vault of cycloVaults) {
		const vaultAddress = vault?.address;
		const totalEligible = BigInt(vault?.totalEligible || '0');

		if (!vaultAddress || totalEligible === 0n) continue;

		const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
		if (token) {
			if (!(token.symbol in totals)) {
				totals[token.symbol] = 0n;
			}
			totals[token.symbol] += totalEligible;
		}
	}

	// Ensure all tokens have entries (even if 0)
	for (const token of currentTokens) {
		if (!(token.symbol in totals)) {
			totals[token.symbol] = 0n;
		}
	}

	return totals;
}

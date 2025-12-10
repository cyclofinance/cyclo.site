import { type StatsQuery } from '../../generated-graphql';
import Stats from '$lib/queries/stats.graphql?raw';
import { getcysFLRwFLRPrice } from './cysFLRwFLRQuote';
import { getcyWETHwFLRPrice } from './cyWETHwFLRQuote';
import { ONE, SUBGRAPH_URL } from '$lib/constants';
import { calculateRewardsPools } from './calculateRewardsPools';
import type { GlobalStats } from '$lib/types';
import { get } from 'svelte/store';
import { tokens } from '$lib/stores';
import { isAddressEqual } from 'viem';

export const calculateApy = (rewardPool: bigint, totalEligible: bigint, price: bigint) => {
	const numerator =
		rewardPool *
		12n * // 12 months
		100n * // will be a percentage
		ONE *
		ONE; // 18 decimals twice, once for the total eligible and once for the price
	const denominator = totalEligible * price;
	return denominator > 0n ? numerator / denominator : 0n;
};

/**
 * Aggregate total eligible amounts from all accounts' vaultBalances
 */
function aggregateTotalEligible(accounts: StatsQuery['accounts']): {
	totalEligibleCysFLR: bigint;
	totalEligibleCyWETH: bigint;
	totalEligibleSum: bigint;
} {
	const currentTokens = get(tokens);
	const totals = { totalEligibleCysFLR: 0n, totalEligibleCyWETH: 0n, totalEligibleSum: 0n };

	if (!accounts) return totals;

	// Aggregate totals from all accounts' vault balances
	for (const account of accounts) {
		if (!account.vaultBalances) continue;

		for (const vaultBalance of account.vaultBalances) {
			const vaultAddress = vaultBalance.vault?.address;
			const totalEligible = BigInt(vaultBalance.vault?.totalEligible || '0');

			if (!vaultAddress || totalEligible === 0n) continue;

			const token = currentTokens.find((t) => isAddressEqual(vaultAddress, t.address));
			if (token) {
				if (token.symbol === 'cysFLR') {
					totals.totalEligibleCysFLR += totalEligible;
				} else if (token.symbol === 'cyWETH') {
					totals.totalEligibleCyWETH += totalEligible;
				}
				totals.totalEligibleSum += totalEligible;
			}
		}
	}

	return totals;
}

export async function fetchStats(): Promise<GlobalStats> {
	const response = await fetch(SUBGRAPH_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			query: Stats
		})
	});
	const data: StatsQuery = (await response.json()).data;

	if (!data.eligibleTotals) throw 'No eligible totals';

	// Aggregate totals from accounts' vaultBalances
	const totals = aggregateTotalEligible(data.accounts);
	const totalEligibleCysFLR = totals.totalEligibleCysFLR;
	const totalEligibleCyWETH = totals.totalEligibleCyWETH;
	const totalEligibleSum = totals.totalEligibleSum;
	const eligibleHolders = (data.accounts ?? []).length;

	// Get prices in FLR terms
	const cysFLRwFLRPrice = await getcysFLRwFLRPrice();
	const cyWETHwFLRPrice = await getcyWETHwFLRPrice();

	// Create eligibleTotals structure for calculateRewardsPools
	const eligibleTotalsForPools = {
		...data.eligibleTotals,
		totalEligibleCysFLR: totalEligibleCysFLR.toString(),
		totalEligibleCyWETH: totalEligibleCyWETH.toString(),
		totalEligibleSum: totalEligibleSum.toString()
	};

	const rewardsPools = calculateRewardsPools(eligibleTotalsForPools);

	// Calculate APY for cysFLR
	const cysFLRApy = calculateApy(rewardsPools.cysFlr, totalEligibleCysFLR, cysFLRwFLRPrice);

	// Calculate APY for cyWETH
	const cyWETHApy = calculateApy(rewardsPools.cyWeth, totalEligibleCyWETH, cyWETHwFLRPrice);

	return {
		eligibleHolders,
		totalEligibleCysFLR,
		totalEligibleCyWETH,
		totalEligibleSum,
		rewardsPools,
		cysFLRApy,
		cyWETHApy
	};
}

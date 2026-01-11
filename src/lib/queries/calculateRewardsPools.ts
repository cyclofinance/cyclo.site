import { ONE, TOTAL_REWARD } from '$lib/constants';
import type { RewardsPools } from '$lib/types';
import type { AccountStatusQuery } from '../../generated-graphql';
import type { CyToken } from '$lib/types';

export const calculateRewardsPools = (
	eligibleTotals: NonNullable<AccountStatusQuery['eligibleTotals']> &
		Record<string, string | undefined>,
	tokens: CyToken[]
): RewardsPools => {
	const pools: RewardsPools = {};
	const totalEligibleSum = BigInt(eligibleTotals.totalEligibleSumSnapshot || '0');

	// Calculate inverse fractions for each token
	const inverseFractions: Record<string, bigint> = {};
	let sum = 0n;

	for (const token of tokens) {
		const totalEligibleKey = `totalEligible${token.symbol}`;
		const totalEligible = BigInt(eligibleTotals[totalEligibleKey] || '0');

		// All values are now normalized to 18 decimals in fetchStats.ts
		// Only include tokens with meaningful eligible amounts (> 0.01 tokens = 10^16 in normalized units)
		const minThreshold = 10n ** 16n; // 0.01 tokens in 18 decimals

		if (totalEligible >= minThreshold && totalEligibleSum > 0n) {
			const inverseFraction = (totalEligibleSum * ONE) / totalEligible;
			inverseFractions[token.symbol] = inverseFraction;
			sum += inverseFraction;
		} else {
			inverseFractions[token.symbol] = 0n;
		}
	}

	// Calculate reward pool for each token
	if (sum > 0n) {
		for (const token of tokens) {
			const inverseFraction = inverseFractions[token.symbol];
			pools[token.symbol] = (inverseFraction * TOTAL_REWARD) / sum;
		}
	} else {
		// If no eligible tokens, distribute evenly
		const evenShare = TOTAL_REWARD / BigInt(tokens.length);
		for (const token of tokens) {
			pools[token.symbol] = evenShare;
		}
	}

	return pools;
};

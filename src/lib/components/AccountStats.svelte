<script lang="ts">
	import type { AccountStats } from '$lib/types';
	import { formatEther, formatUnits } from 'viem';
	import { tokens } from '$lib/stores';

	export let stats: AccountStats;

	// Helper to map token name to GraphQL field name (e.g., "cyWETH.pyth" -> "cyWETH")
	const getTokenFieldName = (tokenName: string): string => {
		return tokenName.replace(/\.pyth$/, '');
	};

	// Get token balance from stats based on token name
	const getTokenBalance = (tokenName: string): bigint => {
		const fieldName = getTokenFieldName(tokenName);
		const balanceMap: Record<string, bigint> = {
			cysFLR: stats?.eligibleBalances.cysFLR ?? 0n,
			cyWETH: stats?.eligibleBalances.cyWETH ?? 0n,
			cyFXRP: stats?.eligibleBalances.cyFXRP ?? 0n,
			cyWBTC: stats?.eligibleBalances.cyWBTC ?? 0n,
			cycbBTC: stats?.eligibleBalances.cycbBTC ?? 0n
		};
		return balanceMap[fieldName] ?? 0n;
	};

	// Get token share from stats based on token name
	const getTokenShare = (tokenName: string) => {
		const fieldName = getTokenFieldName(tokenName);
		const shareMap: Record<string, { percentageShare: bigint; rewardsAmount: bigint }> = {
			cysFLR: stats?.shares.cysFLR ?? { percentageShare: 0n, rewardsAmount: 0n },
			cyWETH: stats?.shares.cyWETH ?? { percentageShare: 0n, rewardsAmount: 0n },
			cyFXRP: stats?.shares.cyFXRP ?? { percentageShare: 0n, rewardsAmount: 0n },
			cyWBTC: stats?.shares.cyWBTC ?? { percentageShare: 0n, rewardsAmount: 0n },
			cycbBTC: stats?.shares.cycbBTC ?? { percentageShare: 0n, rewardsAmount: 0n }
		};
		return shareMap[fieldName] ?? { percentageShare: 0n, rewardsAmount: 0n };
	};

	$: isEligible =
		stats?.eligibleBalances &&
		$tokens.some((token) => {
			const balance = getTokenBalance(token.name);
			return balance > 0n;
		});
</script>

{#if !isEligible}
	<div class="bg-error/10 rounded py-4 text-gray-200">
		This account is not eligible for rewards. Only accounts with positive net transfers from
		approved sources are eligible.
	</div>
{/if}

<div
	class="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
>
	{#each $tokens as token}
		{@const balance = getTokenBalance(token.name)}
		{@const share = getTokenShare(token.name)}
		<div class="space-y-1">
			<div class="text-sm text-gray-300">Net {token.symbol}</div>
			<div
				class="break-words font-mono text-white"
				data-testid="net-{token.name.toLowerCase()}-value"
			>
				{formatUnits(balance, token.decimals)}
			</div>
		</div>
		<div class="space-y-1">
			<div class="text-sm text-gray-300" data-testid="{token.name.toLowerCase()}-rewards">
				{token.symbol} rewards
			</div>
			<div class="flex flex-col gap-y-2 break-words font-mono text-white">
				<span data-testid="{token.name.toLowerCase()}-rewards-value">
					{formatEther(share.rewardsAmount)}
				</span>
				<span data-testid="{token.name.toLowerCase()}-rewards-percentage">
					({formatUnits(share.percentageShare, 16)}%)
				</span>
			</div>
		</div>
	{/each}
	<div class="space-y-1">
		<div class="text-sm text-gray-300">Total Estimated rFLR</div>
		<div class="break-words font-mono text-white" data-testid="total-rewards-value">
			{formatEther(stats.shares.totalRewards)}
		</div>
	</div>
</div>

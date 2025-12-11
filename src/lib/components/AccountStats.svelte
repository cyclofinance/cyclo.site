<script lang="ts">
	import type { AccountStats } from '$lib/types';
	import { formatEther, formatUnits } from 'viem';
	import { tokens } from '$lib/stores';

	export let stats: AccountStats;

	$: isEligible =
		stats?.eligibleBalances &&
		Object.values(stats.eligibleBalances).some((balance) => balance > 0n);
</script>

{#if !isEligible}
	<div class="bg-error/10 rounded py-4 text-gray-200">
		This account is not eligible for rewards. Only accounts with positive net transfers from
		approved sources are eligible.
	</div>
{/if}

<div class="grid grid-cols-1 gap-8 sm:auto-cols-fr sm:grid-flow-col">
	{#each $tokens as token}
		<div class="space-y-4">
			<div class="space-y-1">
				<div class="text-sm text-gray-300">Net {token.symbol}</div>
				<div
					class="break-words font-mono text-white"
					data-testid={`net-${token.symbol.toLowerCase()}-value`}
				>
					{formatEther(stats.eligibleBalances[token.symbol] || 0n)}
				</div>
			</div>
			<div class="space-y-1">
				<div class="text-sm text-gray-300" data-testid={`${token.symbol.toLowerCase()}-rewards`}>
					{token.symbol} rewards
				</div>
				<div class="flex flex-col gap-y-2 break-words font-mono text-white">
					<span data-testid={`${token.symbol.toLowerCase()}-rewards-value`}>
						{formatEther(stats.shares[token.symbol]?.rewardsAmount || 0n)}
					</span>
					<span data-testid={`${token.symbol.toLowerCase()}-rewards-percentage`}>
						({formatUnits(stats.shares[token.symbol]?.percentageShare || 0n, 16)}%)
					</span>
				</div>
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

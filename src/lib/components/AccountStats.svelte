<script lang="ts">
	import type { AccountStats } from '$lib/types';
	import { formatEther, formatUnits } from 'viem';
import { tokens } from '$lib/stores';

	export let stats: AccountStats;

$: cyFXRPInfo = $tokens.find((t) => t.name === 'cyFXRP');
	$: cyFXRPDecimals = cyFXRPInfo?.decimals || 6;

	$: isEligible =
		stats?.eligibleBalances &&
		(stats.eligibleBalances.cyWETH > 0 ||
			stats.eligibleBalances.cysFLR > 0 ||
			stats.eligibleBalances.cyFXRP > 0);
</script>

{#if !isEligible}
	<div class="bg-error/10 rounded py-4 text-gray-200">
		This account is not eligible for rewards. Only accounts with positive net transfers from
		approved sources are eligible.
	</div>
{/if}

<div class="grid grid-cols-1 gap-8 sm:grid-cols-7 sm:gap-8">
	<div class="space-y-1">
		<div class="text-sm text-gray-300">Net cysFLR</div>
		<div class="break-words font-mono text-white" data-testid="net-cysflr-value">
			{formatEther(stats.eligibleBalances.cysFLR)}
		</div>
	</div>
	<div class="space-y-1">
		<div class="text-sm text-gray-300" data-testid="cysflr-rewards">cysFLR rewards</div>
		<div class="flex flex-col gap-y-2 break-words font-mono text-white">
			<span data-testid="cysflr-rewards-value"
				>{formatEther(stats.shares.cysFLR.rewardsAmount)}</span
			>
			<span data-testid="cysflr-rewards-percentage"
				>({formatUnits(stats.shares.cysFLR.percentageShare, 16)}%)</span
			>
		</div>
	</div>
	<div class="space-y-1">
		<div class="text-sm text-gray-300">Net cyWETH</div>
		<div class="break-words font-mono text-white" data-testid="net-cyweth-value">
			{formatEther(stats.eligibleBalances.cyWETH)}
		</div>
	</div>
	<div class="space-y-1">
		<div class="text-sm text-gray-300">cyWETH rewards</div>
		<div class="flex flex-col gap-y-2 break-words font-mono text-white">
			<span data-testid="cyweth-rewards-value"
				>{formatEther(stats.shares.cyWETH.rewardsAmount)}</span
			>
			<span data-testid="cyweth-rewards-percentage"
				>({formatUnits(stats.shares.cyWETH.percentageShare, 16)}%)</span
			>
		</div>
	</div>
	<div class="space-y-1">
		<div class="text-sm text-gray-300">Net cyFXRP</div>
		<div class="break-words font-mono text-white" data-testid="net-cyfxrp-value">
			{formatUnits(stats.eligibleBalances.cyFXRP, cyFXRPDecimals)}
		</div>
	</div>
	<div class="space-y-1">
		<div class="text-sm text-gray-300">cyFXRP rewards</div>
		<div class="flex flex-col gap-y-2 break-words font-mono text-white">
			<span data-testid="cyfxrp-rewards-value"
				>{formatEther(stats.shares.cyFXRP.rewardsAmount)}</span
			>
			<span data-testid="cyfxrp-rewards-percentage"
				>({formatUnits(stats.shares.cyFXRP.percentageShare, 16)}%)</span
			>
		</div>
	</div>
	<div class="space-y-1">
		<div class="text-sm text-gray-300">Total Estimated rFLR</div>
		<div class="break-words font-mono text-white" data-testid="total-rewards-value">
			{formatEther(stats.shares.totalRewards)}
		</div>
	</div>
</div>

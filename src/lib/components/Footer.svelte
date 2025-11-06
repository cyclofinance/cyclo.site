<script lang="ts">
	import { formatEther, formatUnits } from 'ethers';
	import balancesStore from '$lib/balancesStore';
	import { formatNumberWithAbbreviations } from '$lib/methods';
	import { Spinner } from 'flowbite-svelte';
	import { tokens } from '$lib/stores';

	function calculateMarketCap(price: bigint, supply: bigint): bigint {
		return (price * supply) / BigInt(1e6);
	}

	$: globalTvl =
		($balancesStore.stats.cysFLR?.usdTvl || 0n) +
		($balancesStore.stats.cyWETH?.usdTvl || 0n) +
		($balancesStore.stats.cyFXRP?.usdTvl || 0n);
</script>

<footer
	class="flex w-full flex-col justify-center bg-[#1C02B8] px-2 py-6 text-sm text-white sm:px-6 sm:text-base"
>
	{#if $balancesStore.statsLoading}
		<div class="flex justify-center py-8">
			<Spinner size="8" color="white" />
		</div>
	{:else}
		<div class="flex w-full max-w-2xl flex-col justify-between gap-4 self-center sm:gap-0">
			<div class="border-b border-white/20 pb-2">
				<div
					class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
					data-testId="global-tvl"
				>
					<span>Global TVL</span>
					<span>$ {Number(formatUnits(globalTvl, 18))}</span>
				</div>
			</div>
			{#each ['cysFLR', 'cyWETH', 'cyFXRP'] as tokenName}
				{@const tokenInfo = tokens.find(t => t.name === tokenName)}
				<div class="flex flex-col gap-2 border-b border-white/20 pb-2 last:border-0">
					<div class="font-bold">{tokenName}</div>
					<div
						class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
						data-testId="lock-price"
					>
						<span>Current Lock Price ({tokenName} per {tokenName.slice(2)})</span>
						<span
							>{Number(formatEther($balancesStore.stats[tokenName]?.lockPrice || 0n)).toString()}</span
						>
					</div>
					<div class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2" data-testId="price">
						<span>Current {tokenName} Price</span>
						<span>
							$ {Number(formatUnits($balancesStore.stats[tokenName]?.price || 0n, 6))}
						</span>
					</div>
					{#if $balancesStore.stats[tokenName]?.supply}
						<div
							class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
							data-testId="supply"
						>
							<span>Total {tokenName} supply</span>
							<span>
								{formatNumberWithAbbreviations(
									Number(formatUnits($balancesStore.stats[tokenName].supply, tokenInfo?.decimals || 18))
								)}
							</span>
						</div>
					{/if}
					<div
						class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
						data-testId={`market-cap-${tokenName}`}
					>
						<span>{tokenName} Market Cap</span>
						<span>
							$ {Number(
								formatEther(
									calculateMarketCap(
										$balancesStore.stats[tokenName]?.price || 0n,
										$balancesStore.stats[tokenName]?.supply || 0n
									)
								)
							)}
						</span>
					</div>
					{#if $balancesStore.stats[tokenName]?.underlyingTvl}
						<div class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2" data-testId="tvl">
							<span>Total Value Locked</span>
							<span>
								{Number(formatUnits($balancesStore.stats[tokenName].underlyingTvl, tokenInfo?.decimals || 18))}
								{tokenName.slice(2)}
								/ $ {Number(formatUnits($balancesStore.stats[tokenName].usdTvl, tokenInfo?.decimals))}
							</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</footer>

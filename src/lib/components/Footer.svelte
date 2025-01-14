<script lang="ts">
	import { formatEther, formatUnits } from 'ethers';
	import balancesStore from '$lib/balancesStore';
	import { formatNumberWithAbbreviations } from '$lib/methods';
	import { Spinner } from 'flowbite-svelte';

	function calculateMarketCap(price: bigint, supply: bigint): bigint {
		return (price * supply) / BigInt(1e6);
	}
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
			{#each ['cysFLR', 'cyWETH'] as token}
				<div class="flex flex-col gap-2 border-b border-white/20 pb-2 last:border-0">
					<div class="font-bold">{token}</div>
					<div
						class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
						data-testId="lock-price"
					>
						<span>Current Lock Price ({token} per {token.slice(2)})</span>
						<span
							>{Number(formatEther($balancesStore.stats[token]?.lockPrice || 0n)).toString()}</span
						>
					</div>
					<div class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2" data-testId="price">
						<span>Current {token} Price</span>
						<span>
							$ {Number(formatUnits($balancesStore.stats[token]?.price || 0n, 6))}
						</span>
					</div>
					{#if $balancesStore.stats[token]?.supply}
						<div
							class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
							data-testId="supply"
						>
							<span>Total {token} supply</span>
							<span>
								{formatNumberWithAbbreviations(
									Number(formatEther($balancesStore.stats[token].supply))
								)}
							</span>
						</div>
					{/if}
					<div
						class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
						data-testId="market-cap"
					>
						<span>{token} Market Cap</span>
						<span>
							$ {Number(
								formatEther(
									calculateMarketCap(
										$balancesStore.stats[token]?.price || 0n,
										$balancesStore.stats[token]?.supply || 0n
									)
								)
							)}
						</span>
					</div>
					{#if $balancesStore.stats[token]?.underlyingTvl}
						<div class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2" data-testId="tvl">
							<span>Total Value Locked</span>
							<span>
								{Number(formatEther($balancesStore.stats[token].underlyingTvl))}
								{token.slice(2)}
								/ $ {Number(formatUnits($balancesStore.stats[token].usdTvl, 18))}
							</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</footer>

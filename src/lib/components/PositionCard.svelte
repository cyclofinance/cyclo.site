<script lang="ts">
	/**
	 * One lock position. Identity = the price it was locked at. One colored
	 * number (net to close); everything else is a plain label/value pair on a
	 * fixed grid so fifty cards read as one calm list.
	 */
	import type { CyToken } from '$lib/types';
	import {
		formatAmount,
		formatLockPrice,
		formatPct,
		formatUsd,
		type PositionRow
	} from '$lib/positions';

	export let row: PositionRow;
	export let token: CyToken;
	export let onUnlock: () => void;

	$: tone =
		row.netToCloseUsd === null ? 'text-dim' : row.netToCloseUsd < 0n ? 'text-loss' : 'text-gain';

	const usd = (v: bigint | null) => formatUsd(v).replace('+', '');
</script>

<article
	class="flex flex-col gap-4 rounded-card border-frame border-line bg-primary p-5 text-ink"
	data-testid="card-{token.name}-{row.receipt.tokenId}"
>
	<header class="flex items-baseline justify-between gap-4">
		<div>
			<div class="font-semibold">Locked at ${formatLockPrice(row.lockPriceUsd)}</div>
			<div class="text-xs text-dim">{row.held === null ? 'held —' : `held ${row.held}d`}</div>
		</div>
		<div class="text-right">
			<div class="text-2xl font-bold {tone}" data-testid="card-net">
				{formatUsd(row.netToCloseUsd)}
			</div>
			<div class="text-xs text-dim">
				Net to close · <span class={tone} data-testid="card-pct">{formatPct(row.pnlPct)}</span>
			</div>
		</div>
	</header>

	<dl class="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
		<div>
			<dt class="text-xs text-dim">Locked</dt>
			<dd>{formatAmount(row.underlyingAmount, token.decimals)} {token.underlyingSymbol}</dd>
		</div>
		<div>
			<dt class="text-xs text-dim">Value in it</dt>
			<dd>{usd(row.collateralValueUsd)}</dd>
		</div>
		<div>
			<dt class="text-xs text-dim">Owed</dt>
			<dd>{formatAmount(row.receipt.balance, token.decimals)} {token.name}</dd>
		</div>
		<div>
			<dt class="text-xs text-dim">Payoff today</dt>
			<dd data-testid="card-payoff">{usd(row.cyTokenRepayUsd)}</dd>
		</div>
		<div class="col-span-2">
			<dt class="text-xs text-dim">Less than at lock</dt>
			<dd data-testid="card-payoff-saved">
				{#if row.payoffSavedUsd === null}
					—
				{:else if row.payoffSavedUsd >= 0n}
					{usd(row.payoffSavedUsd)}
					<span class="text-dim">({formatPct(row.payoffDiscountPct).replace('+', '')})</span>
				{:else}
					−{usd(-row.payoffSavedUsd)} more
					<span class="text-dim">({formatPct(row.payoffDiscountPct).replace('−', '')})</span>
				{/if}
			</dd>
		</div>
	</dl>

	<button
		class="rounded-card border-frame border-line py-2 text-sm font-semibold text-dim hover:border-ink hover:text-ink"
		on:click={onUnlock}
		data-testid="card-unlock"
	>
		Unlock
	</button>
</article>

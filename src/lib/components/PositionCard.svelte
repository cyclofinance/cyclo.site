<script lang="ts">
	/**
	 * One lock position as a card — the operator's DTP card, rebuilt on live
	 * chain data: current price vs price at lock, collateral value, what the
	 * cyTokens cost to buy back today (and how far below $1 that is), P&L in
	 * dollars and percent, days held, and Cyclo's own Unlock.
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
	$: priceTone = row.pricePct === null ? 'text-dim' : row.pricePct < 0 ? 'text-loss' : 'text-gain';
	$: payoffTone =
		row.payoffSavedUsd === null ? 'text-dim' : row.payoffSavedUsd < 0n ? 'text-loss' : 'text-gain';
</script>

<article
	class="flex flex-col gap-4 rounded-card border-frame border-line bg-primary p-5 text-ink"
	data-testid="card-{token.name}-{row.receipt.tokenId}"
>
	<header class="flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div
				class="bg-accent/20 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-accent"
			>
				{token.underlyingSymbol.slice(0, 2)}
			</div>
			<div>
				<div class="font-semibold">{token.underlyingSymbol} → {token.name}</div>
				<div class="text-xs text-dim">
					{row.held === null ? 'held —' : `held ${row.held}d`}
				</div>
			</div>
		</div>
		<div class="text-right">
			<div class="text-2xl font-bold {tone}" data-testid="card-net">
				{formatUsd(row.netToCloseUsd)}
			</div>
			<div class="text-xs text-dim">Net to close</div>
		</div>
	</header>

	<div class="bg-page/60 grid grid-cols-2 gap-4 rounded-card p-3 text-sm">
		<div>
			<div class="text-xs text-dim">Current price</div>
			<div class="font-semibold">
				{row.underlyingUsdNow === null ? '—' : `$${formatLockPrice(row.underlyingUsdNow)}`}
			</div>
		</div>
		<div>
			<div class="text-xs text-dim">Price at lock</div>
			<div class="font-semibold">
				${formatLockPrice(row.lockPriceUsd)}
				<span class="ml-1 text-xs {priceTone}" data-testid="card-price-pct"
					>{formatPct(row.pricePct)}</span
				>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-4 text-sm">
		<div>
			<div class="text-xs text-dim">Value in it</div>
			<div class="text-lg font-semibold">{formatUsd(row.collateralValueUsd).replace('+', '')}</div>
			<div class="text-xs text-dim">
				{formatAmount(row.underlyingAmount, token.decimals)}
				{token.underlyingSymbol}
			</div>
		</div>
		<div>
			<div class="text-xs text-dim">Payoff today</div>
			<div class="text-lg font-semibold">{formatUsd(row.cyTokenRepayUsd).replace('+', '')}</div>
			<div class="text-xs text-dim">
				{formatAmount(row.receipt.balance, token.decimals)}
				{token.name}
				{#if row.cyDiscountPct !== null && row.cyDiscountPct > 0}
					<span class="text-gain" data-testid="card-discount"
						>· {formatPct(row.cyDiscountPct).replace('+', '')} below $1</span
					>
				{/if}
			</div>
		</div>
	</div>

	<!-- The loan got cheaper: what the cyToken was worth when this was minted vs now. -->
	<div class="bg-page/60 flex flex-col gap-1 rounded-card p-3 text-sm" data-testid="card-payoff">
		<div class="flex items-center justify-between">
			<span class="text-dim">{token.name} at lock → now</span>
			<span class="font-semibold">
				{row.cyTokenUsdAtLock === null ? '—' : `$${formatLockPrice(row.cyTokenUsdAtLock)}`}
				<span class="text-dim">→</span>
				{row.cyTokenUsdNow === null ? '—' : `$${formatLockPrice(row.cyTokenUsdNow)}`}
			</span>
		</div>
		<div class="flex items-center justify-between">
			<span class="text-dim">Pay it off for</span>
			<span class="font-bold {payoffTone}" data-testid="card-payoff-saved">
				{#if row.payoffSavedUsd === null}
					—
				{:else if row.payoffSavedUsd >= 0n}
					{formatUsd(row.payoffSavedUsd).replace('+', '')} less
					<span class="text-sm">({formatPct(row.payoffDiscountPct).replace('+', '')} cheaper)</span>
				{:else}
					{formatUsd(-row.payoffSavedUsd).replace('+', '')} more
					<span class="text-sm">({formatPct(row.payoffDiscountPct).replace('−', '')} dearer)</span>
				{/if}
			</span>
		</div>
	</div>

	<div class="bg-page/60 flex items-center justify-between rounded-card p-3">
		<div class="text-sm text-dim">Unrealized P&L</div>
		<div class="text-right">
			<span class="text-lg font-bold {tone}" data-testid="card-pnl"
				>{formatUsd(row.netToCloseUsd)}</span
			>
			<span class="ml-2 text-sm {tone}" data-testid="card-pnl-pct">{formatPct(row.pnlPct)}</span>
		</div>
	</div>
	<div class="-mt-2 flex items-center justify-between px-1 text-xs text-dim">
		<span>Cost basis {formatUsd(row.costBasisUsd).replace('+', '')}</span>
		<span>Value now {formatUsd(row.collateralValueUsd).replace('+', '')}</span>
	</div>

	<button
		class="mt-1 w-full rounded-card border-frame border-line py-2 font-bold text-ink hover:border-accent hover:text-accent"
		on:click={onUnlock}
		data-testid="card-unlock"
	>
		Unlock
	</button>
</article>

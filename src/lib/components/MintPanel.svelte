<script lang="ts">
	/**
	 * Lock collateral, mint cyTokens. One panel, one action. Uses Cyclo's own
	 * lock flow (`transactionStore.handleLockTransaction`: allowance check,
	 * approve if needed, deposit) — nothing here signs or moves money itself.
	 */
	import { signerAddress, wagmiConfig } from 'svelte-wagmi';
	import { formatUnits, parseUnits, type Hex } from 'viem';
	import balancesStore from '$lib/balancesStore';
	import transactionStore from '$lib/transactionStore';
	import { usdcAddress } from '$lib/stores';
	import type { CyToken } from '$lib/types';
	import Input from './Input.svelte';
	import Button from './Button.svelte';
	import Select from './Select.svelte';
	import { formatAmount } from '$lib/positions';

	/** Tokens that can be minted (a live market exists). */
	export let tokens: CyToken[];

	let token: CyToken = tokens[0];
	// The parent decides which products are lockable (one at a time on the
	// manager page). When that list changes, follow it and start the amount over.
	$: if (!tokens.some((t) => t.name === token?.name)) {
		token = tokens[0];
		amountText = '';
		assets = 0n;
	}
	let amountText = '';
	let assets = 0n;
	let lastPricedToken: string | null = null;

	$: balance = $balancesStore.balances[token?.name]?.signerUnderlyingBalance ?? 0n;
	$: insufficient = assets > balance;
	$: preview = assets > 0n ? $balancesStore.swapQuotes.cyTokenOutput : 0n;

	// Price the selected token once per selection (the root layout only polls the
	// globally selected token).
	$: if (token && $wagmiConfig && token.name !== lastPricedToken) {
		lastPricedToken = token.name;
		balancesStore.refreshPrices($wagmiConfig, token);
	}

	$: if (token && $wagmiConfig && assets > 0n) {
		balancesStore.refreshDepositPreviewSwapValue($wagmiConfig, token, $usdcAddress, assets);
	}

	const parse = (text: string) => {
		try {
			assets = text ? parseUnits(text, token.decimals) : 0n;
		} catch {
			assets = 0n;
		}
	};

	const setMax = () => {
		assets = balance;
		amountText = formatUnits(balance, token.decimals);
	};

	const lock = () => {
		if (!$signerAddress || assets === 0n || insufficient) return;
		transactionStore.handleLockTransaction({
			signerAddress: $signerAddress as Hex,
			config: $wagmiConfig,
			selectedToken: token,
			assets
		});
	};
</script>

<section
	class="flex w-full flex-col gap-4 border-frame border-line bg-primary p-4 text-ink"
	data-testid="mint-panel"
>
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-bold">Lock more</h2>
		{#if tokens.length > 1}
			<Select
				options={tokens}
				bind:selected={token}
				getOptionLabel={(t) => t.underlyingSymbol}
				dataTestId="mint-token"
			/>
		{:else}
			<span class="text-lg" data-testid="mint-token-pinned">{token.underlyingSymbol}</span>
		{/if}
	</div>

	<div class="flex flex-col gap-1">
		<Input
			dataTestId="mint-input"
			bind:amount={amountText}
			unit={token.underlyingSymbol}
			maxButton
			on:input={(e) => parse(e.detail.value)}
			on:setValueToMax={setMax}
		/>
		<p class="text-right text-xs text-dim" data-testid="mint-balance">
			{formatAmount(balance, token.decimals)}
			{token.underlyingSymbol} in wallet
		</p>
	</div>

	<div class="flex items-baseline justify-between text-lg">
		<span class="text-dim">You receive</span>
		<span class="font-bold" data-testid="mint-preview">
			{assets > 0n ? formatAmount(preview, token.decimals) : '0'}
			{token.name}
		</span>
	</div>

	<Button
		dataTestId="mint-button"
		customClass="w-full bg-ink text-page text-lg"
		disabled={assets === 0n || insufficient}
		on:click={lock}
	>
		{insufficient ? `Not enough ${token.underlyingSymbol}` : 'Lock'}
	</Button>
</section>

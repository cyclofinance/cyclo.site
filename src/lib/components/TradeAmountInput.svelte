<script lang="ts">
	import Input from './Input.svelte';
	import { readErc20BalanceOf, readErc20Decimals } from '../../generated';
	import type { Hex } from 'viem';
	import { formatUnits, parseUnits } from 'viem';
	import { signerAddress, wagmiConfig } from 'svelte-wagmi';
	import type { Token } from '$lib/types';
	import type { ValidateFunction } from '$lib/trade/validateDeploymentArgs';

	export let amountToken: Token;
	let inputAmount: string | undefined;
	export let amount: bigint | undefined = undefined;

	export let validate: ValidateFunction = () => undefined;
	export let isError: boolean = false;

	export let dataTestId: string = '';

	let balance: bigint = 0n;
	let decimals: number = 0;

	$: if (amountToken) {
		resetInputAmount();
	}

	const resetInputAmount = () => {
		inputAmount = undefined;
		amount = undefined;
	};

	$: if (inputAmount) {
		amount = parseUnits(inputAmount, decimals);
	}

	$: balancePromise = (async () => {
		if (!amountToken) return;
		if (!$signerAddress) return;
		const [balance, decimals] = await Promise.all([
			readErc20BalanceOf($wagmiConfig, {
				address: amountToken.address,
				args: [$signerAddress as Hex]
			}),
			readErc20Decimals($wagmiConfig, { address: amountToken.address })
		]);
		return { balance, decimals };
	})();

	$: balancePromise.then((data) => {
		if (!data) return;
		balance = data.balance;
		decimals = data.decimals;
	});

	const setValueToMax = () => {
		inputAmount = formatUnits(balance, decimals);
		amount = balance;
	};
</script>

<div class="flex flex-col gap-2">
	<Input
		bind:amount={inputAmount}
		type="number"
		unit={amountToken.symbol}
		maxButton
		on:setValueToMax={setValueToMax}
		{dataTestId}
		{validate}
		bind:isError
	/>
	<span class="text-right text-sm text-gray-200">
		{#await balancePromise}
			Loading balance...
		{:then data}
			{#if data}
				Balance: {formatUnits(data.balance, data.decimals)} {amountToken.symbol}
			{/if}
		{/await}
	</span>
</div>

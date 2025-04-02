<script lang="ts">
	import { signerAddress } from 'svelte-wagmi';
	import { createEventDispatcher } from 'svelte';
	import { handleDecimalSeparator } from '$lib/utils/handleDecimalSeparator';

	export let amount: string = '';
	export let unit: string = '';
	export let maxButton: boolean = false;

	let displayValue = amount.toString();

	const dispatch = createEventDispatcher();

	function setValueToMax() {
		dispatch('setValueToMax');
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const formattedValue = handleDecimalSeparator({ target: { value: target.value } });
		displayValue = formattedValue;

		// Update the actual value
		amount = formattedValue;
		dispatch('input', { value: formattedValue });
	}

	// Keep display value in sync when amount changes externally
	$: if (amount && amount.toString() !== displayValue) {
		displayValue = amount.toString();
	} else if (!amount) {
		displayValue = '';
	}
</script>

<div
	class="flex h-full w-full items-center justify-end rounded-sm border border-white text-lg font-semibold text-primary outline-none md:text-2xl"
>
	<input
		class="mr-2 w-full min-w-0 border-none bg-primary p-0 text-right text-base text-white outline-none [appearance:textfield] focus:ring-0 sm:text-lg md:text-2xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
		{...$$restProps}
		on:input={handleInput}
		min={0}
		placeholder="0.0"
		step="0.1"
		type="text"
		value={displayValue}
	/>
	{#if unit}
		<span
			data-testid="unit"
			class="h-full content-center self-center bg-primary pr-2 text-right text-base text-white sm:text-lg md:text-2xl"
		>
			{unit}</span
		>
	{/if}
	{#if maxButton}
		<button
			disabled={!$signerAddress}
			data-testid={'set-val-to-max'}
			on:click={setValueToMax}
			class="flex cursor-pointer items-center self-stretch bg-white pl-3 pr-2 text-sm sm:text-base"
			>MAX</button
		>
	{/if}
</div>

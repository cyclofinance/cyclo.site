<script lang="ts">
	import type { Token } from '$lib/types';
	import { writable } from 'svelte/store';
	import TradeAmountInput from './TradeAmountInput.svelte';

	export let amountToken: Token;
	export let amountStore = writable<bigint>(0n);

	let amount: bigint = 0n;
	$: $amountStore = amount;
</script>

<TradeAmountInput {amountToken} bind:amount />

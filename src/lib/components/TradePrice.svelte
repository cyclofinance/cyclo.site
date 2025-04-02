<script lang="ts">
	import type { Token } from '$lib/types';
	import { getPrice, getAndStartDataFetcher } from '$lib/trade/prices';
	import { onMount } from 'svelte';
	import type { DataFetcher } from 'sushi';

	export let inputToken: Token;
	export let outputToken: Token;

	let pricePromise: Promise<string>;

	let dataFetcher: DataFetcher;

	onMount(() => {
		dataFetcher = getAndStartDataFetcher();
	});

	$: if (dataFetcher) pricePromise = getPrice(outputToken, inputToken, dataFetcher);
</script>

<div class="text-right">
	{#await pricePromise}
		<div class="text-sm text-gray-200">Loading market price...</div>
	{:then price}
		<div class="text-sm text-gray-200">Current price: {price}</div>
	{/await}
</div>

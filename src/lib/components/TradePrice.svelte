<script lang="ts">
	import type { Token } from '$lib/types';
	import { getPrice } from '$lib/trade/prices';
	import { useDataFetcher } from '$lib/dataFetcher';

	export let inputToken: Token;
	export let outputToken: Token;
	export let dataTestId: string = '';

	let pricePromise: Promise<string>;

	const dataFetcher = useDataFetcher();

	$: pricePromise = getPrice(outputToken, inputToken, dataFetcher);
</script>

<div class="text-right" data-testid={dataTestId}>
	{#await pricePromise}
		<div class="text-sm text-gray-200">Loading market price...</div>
	{:then price}
		<div class="text-sm text-gray-200">Current price: {price}</div>
	{/await}
</div>

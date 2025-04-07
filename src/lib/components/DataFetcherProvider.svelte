<script lang="ts">
	import { getAndStartDataFetcher } from '$lib/trade/prices';
	import type { DataFetcher } from 'sushi';
	import { onMount, setContext } from 'svelte';
	import { writable } from 'svelte/store';

	// Create a writable store for the DataFetcher
	const dataFetcherStore = writable<DataFetcher | undefined>(undefined);

	onMount(async () => {
		const fetcher = await getAndStartDataFetcher();
		dataFetcherStore.set(fetcher);
	});

	setContext('dataFetcher', dataFetcherStore);
</script>

{#if $dataFetcherStore}
	<slot />
{/if}

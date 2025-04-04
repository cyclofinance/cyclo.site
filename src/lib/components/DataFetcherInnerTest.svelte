<script lang="ts">
	import { getContext } from 'svelte';

	const dataFetcher = getContext('dataFetcher');
</script>

{#if dataFetcher}
	<div data-testid="data-fetcher-available">Data fetcher is in context</div>
{/if}

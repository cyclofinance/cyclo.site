<script lang="ts">
	import DataFetcherProvider from './DataFetcherProvider.svelte';
	import DataFetcherInnerTest from './DataFetcherInnerTest.svelte';
</script>

<DataFetcherProvider>
	<div data-testid="slot-content">Data Fetcher is available</div>
	<DataFetcherInnerTest />
</DataFetcherProvider>

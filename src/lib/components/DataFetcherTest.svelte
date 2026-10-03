<script lang="ts">
  import DataFetcherProvider from "./DataFetcherProvider.svelte";
  import DataFetcherInnerTest from "./DataFetcherInnerTest.svelte";
</script>

<DataFetcherProvider>
  <div data-testid="slot-content">Data Fetcher is available</div>
  <DataFetcherInnerTest />
  <svelte:fragment slot="error" let:error>
    <div data-testid="slot-error">{error?.message}</div>
    <DataFetcherInnerTest />
  </svelte:fragment>
</DataFetcherProvider>

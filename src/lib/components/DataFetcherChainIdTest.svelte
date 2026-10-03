<script lang="ts">
  import DataFetcherProvider from "./DataFetcherProvider.svelte";
  import DataFetcherChainIdReader from "./DataFetcherChainIdReader.svelte";
</script>

<DataFetcherProvider>
  <DataFetcherChainIdReader />
</DataFetcherProvider>

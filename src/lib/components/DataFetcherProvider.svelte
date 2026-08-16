<script lang="ts">
  import { getAndStartDataFetcher } from "$lib/trade/prices";
  import type { DataFetcher } from "sushi";
  import { onMount, setContext } from "svelte";
  import { writable } from "svelte/store";

  const dataFetcherStore = writable<DataFetcher | undefined>(undefined);
  const dataFetcherError = writable<Error | undefined>(undefined);

  onMount(async () => {
    try {
      const fetcher = await getAndStartDataFetcher();
      dataFetcherStore.set(fetcher);
    } catch (err) {
      console.error("DataFetcherProvider: failed to initialise", err);
      dataFetcherError.set(err instanceof Error ? err : new Error(String(err)));
    }
  });

  setContext("dataFetcher", dataFetcherStore);
  setContext("dataFetcherError", dataFetcherError);
</script>

{#if $dataFetcherStore}
  <slot />
{:else if $dataFetcherError}
  <slot name="error" error={$dataFetcherError} />
{/if}

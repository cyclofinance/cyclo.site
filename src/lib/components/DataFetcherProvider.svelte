<script lang="ts">
  import { getAndStartDataFetcher } from "$lib/trade/prices";
  import { selectedNetwork } from "$lib/stores";
  import type { DataFetcher } from "sushi";
  import { onMount, setContext } from "svelte";
  import { writable } from "svelte/store";

  const dataFetcherStore = writable<DataFetcher | undefined>(undefined);

  setContext("dataFetcher", dataFetcherStore);

  onMount(() => {
    const unsubscribe = selectedNetwork.subscribe((network) => {
      const chainId = network?.chain.id;
      if (chainId === undefined) return;
      try {
        const fetcher = getAndStartDataFetcher(chainId);
        dataFetcherStore.set(fetcher);
      } catch (err) {
        console.error("DataFetcherProvider: failed to initialise", err);
        dataFetcherStore.set(undefined);
      }
    });
    return unsubscribe;
  });
</script>

{#if $dataFetcherStore}
  <slot />
{/if}

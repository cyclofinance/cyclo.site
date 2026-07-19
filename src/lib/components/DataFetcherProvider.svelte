<script lang="ts">
  import { getAndStartDataFetcher } from "$lib/trade/prices";
  import { selectedNetwork } from "$lib/stores";
  import type { DataFetcher } from "sushi";
  import { onMount, setContext } from "svelte";
  import { writable } from "svelte/store";

  // Create a writable store for the DataFetcher
  const dataFetcherStore = writable<DataFetcher | undefined>(undefined);

  // chainId of the most recently requested DataFetcher; used to discard a
  // fetcher whose network was superseded before its fetch resolved.
  let requestedChainId: number | undefined;

  onMount(() => {
    // Follow runtime network switches: refetch the DataFetcher for the
    // selected network instead of pinning to the chain mounted with.
    return selectedNetwork.subscribe((network) => {
      const chainId = network.chain.id;
      requestedChainId = chainId;
      Promise.resolve(getAndStartDataFetcher(chainId)).then((fetcher) => {
        if (requestedChainId === chainId) {
          dataFetcherStore.set(fetcher);
        }
      });
    });
  });

  setContext("dataFetcher", dataFetcherStore);
</script>

{#if $dataFetcherStore}
  <slot />
{/if}

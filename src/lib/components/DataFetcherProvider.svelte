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
      // The fetch runs inside an async IIFE so a SYNCHRONOUS throw from
      // getAndStartDataFetcher (unsupported chain, missing wagmi config, no
      // public client) becomes a rejection this try/catch owns, instead of
      // escaping the subscriber and breaking the caller that switched the
      // network. Rejections of an async implementation land here too.
      void (async () => {
        try {
          const fetcher = await getAndStartDataFetcher(chainId);
          if (requestedChainId === chainId) {
            dataFetcherStore.set(fetcher);
          }
        } catch (error) {
          console.error(
            `Failed to start DataFetcher for chainId ${chainId}:`,
            error,
          );
          // Only the CURRENT selection may clear the store: a superseded
          // network's late failure must not wipe the fetcher in use.
          if (requestedChainId === chainId) {
            dataFetcherStore.set(undefined);
          }
        }
      })();
    });
  });

  setContext("dataFetcher", dataFetcherStore);
</script>

{#if $dataFetcherStore}
  <slot />
{/if}

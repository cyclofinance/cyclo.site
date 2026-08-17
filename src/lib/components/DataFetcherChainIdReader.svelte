<script lang="ts">
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";
  import type { DataFetcher } from "sushi";

  const dataFetcher =
    getContext<Writable<DataFetcher | undefined>>("dataFetcher");
</script>

{#if $dataFetcher}
  <div data-testid="fetcher-chain-id">{$dataFetcher.chainId}</div>
{/if}

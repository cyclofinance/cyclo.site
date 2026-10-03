<script lang="ts">
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  const dataFetcher = getContext("dataFetcher");
  const dataFetcherError =
    getContext<Writable<Error | undefined>>("dataFetcherError");
</script>

{#if dataFetcher}
  <div data-testid="data-fetcher-available">Data fetcher is in context</div>
{/if}
{#if $dataFetcherError}
  <div data-testid="data-fetcher-error">{$dataFetcherError.message}</div>
{/if}

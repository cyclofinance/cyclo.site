<script lang="ts" generics="T">
  // eslint-disable-next-line
  export let options: T[];
  // eslint-disable-next-line
  export let selected: T;
  // eslint-disable-next-line
  export let getOptionLabel: (option: T) => string;

  export let dataTestId: string = "";

  // Options are matched by a stable key, not by reference, so a refetch that
  // rebuilds options with new object identities keeps the selection.
  const optionKey = (option: unknown): unknown => {
    if (option === null || typeof option !== "object") return option;
    const record = option as Record<string, unknown>;
    if (typeof record.address === "string") {
      const address = record.address.toLowerCase();
      return record.chainId === undefined
        ? address
        : `${record.chainId}:${address}`;
    }
    if ("value" in record) return record.value;
    if ("id" in record) return record.id;
    return option;
  };

  // Rebind selected to the key-matching entry so bind:value, which compares
  // by reference, highlights it; default to the first option otherwise.
  $: if (options.length > 0) {
    const match =
      selected === undefined
        ? undefined
        : options.find((option) => optionKey(option) === optionKey(selected));
    const next = match ?? options[0];
    if (next !== selected) {
      selected = next;
    }
  }
</script>

{#if options.length > 0}
  <select
    class="rounded border border-white bg-transparent px-2 py-1"
    bind:value={selected}
    on:change
    data-testid={dataTestId}
  >
    {#each options as option}
      <option value={option}>
        {getOptionLabel(option)}
      </option>
    {/each}
  </select>
{/if}

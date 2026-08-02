<script lang="ts" generics="T">
  // eslint-disable-next-line
  export let options: T[];
  // eslint-disable-next-line
  export let selected: T;
  // eslint-disable-next-line
  export let getOptionLabel: (option: T) => string;

  export let dataTestId: string = "";

  // Options are matched by optionKey when provided, else by reference.
  // Without a key, replacing options with freshly constructed but logically
  // equal objects resets the selection to the first option.
  // eslint-disable-next-line
  export let optionKey: ((option: T) => string | number) | undefined =
    undefined;

  // Ensure selected is one of options (rebinding it to the key-matching
  // entry so bind:value tracks the current identities), or default to the
  // first option. Assignment is guarded on identity change to avoid
  // re-triggering this reactive block.
  // optionKey is captured in a local const so TypeScript's narrowing
  // persists inside the find callback.
  $: if (options.length > 0) {
    const key = optionKey;
    const match =
      selected && key
        ? options.find((option) => key(option) === key(selected))
        : selected && options.includes(selected)
          ? selected
          : undefined;
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

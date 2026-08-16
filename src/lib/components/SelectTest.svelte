<script lang="ts">
  import Select from "./Select.svelte";

  type Option = { id: string; label: string };

  export let options: Option[];
  export let selected: Option;
  export let optionKey: ((option: Option) => string) | undefined = undefined;
</script>

<Select
  {options}
  bind:selected
  {optionKey}
  getOptionLabel={(option) => option.label}
  dataTestId="select-under-test"
/>
<div data-testid="selected-id">{selected?.id}</div>

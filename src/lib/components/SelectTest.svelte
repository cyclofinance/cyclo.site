<script lang="ts" generics="T">
  import Select from "./Select.svelte";

  // eslint-disable-next-line
  export let options: T[];
  // eslint-disable-next-line
  export let selected: T;
  // eslint-disable-next-line
  export let getOptionLabel: (option: T) => string;
</script>

<Select
  {options}
  bind:selected
  {getOptionLabel}
  dataTestId="select-under-test"
/>
<div data-testid="selected-label">
  {selected === undefined ? "unset" : getOptionLabel(selected)}
</div>

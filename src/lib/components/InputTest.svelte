<script lang="ts">
  import { writable } from "svelte/store";
  import Input from "./Input.svelte";

  export let amount: string = "";
  export let amountStore = writable<string>(amount);
  $: $amountStore = amount;

  let isError = false;
  export let isErrorStore = writable<boolean>(false);
  $: $isErrorStore = isError;
</script>

<Input bind:amount bind:isError />

<script lang="ts">
  import { writable } from "svelte/store";
  import Input from "./Input.svelte";

  export let amount: string = "";
  export let amountStore = writable<string>(amount);
  $: $amountStore = amount;
</script>

<Input bind:amount />

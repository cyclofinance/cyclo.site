<script lang="ts">
	import VaultIdInput from './VaultIdInput.svelte';
	import { type Writable } from 'svelte/store';
	export let vaultIdStore: Writable<string>;
	export let isErrorStore: Writable<boolean>;
</script>

<VaultIdInput bind:vaultId={$vaultIdStore} bind:isError={$isErrorStore} />

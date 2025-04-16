<script lang="ts">
	import VaultIdInput from './VaultIdInput.svelte';

	export let vaultIdStore;
	export let isErrorStore = undefined;
</script>

<VaultIdInput bind:vaultId={$vaultIdStore} bind:isError={$isErrorStore} />

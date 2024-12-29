<script lang="ts">
	import AccountStatus from '$lib/components/AccountStatus.svelte';
	import { signerAddress } from 'svelte-wagmi';
</script>

{#if $signerAddress}
	<AccountStatus account="0x1d56a5ed5cbeaa8885bb61c820b7f897da00531c" />
{/if}

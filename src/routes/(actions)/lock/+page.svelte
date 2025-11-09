<script lang="ts">
	import { activeNetworkKey } from '$lib/stores';
	import Lock from '$lib/components/Lock.svelte';
</script>

{#key $activeNetworkKey}
	<Lock />
{/key}
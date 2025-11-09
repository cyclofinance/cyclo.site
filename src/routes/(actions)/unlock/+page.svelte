<script lang="ts">
	import { activeNetworkKey } from '$lib/stores';
	import Unlock from '$lib/components/Unlock.svelte';
</script>

{#key $activeNetworkKey}
	<Unlock />
{/key}

<script lang="ts">
	import { Tooltip } from 'flowbite-svelte';
	import { InfoCircleOutline } from 'flowbite-svelte-icons';
</script>

<span
	class="inline-block cursor-pointer text-sm text-gray-500 hover:text-gray-700"
	data-testid="info-icon"
>
	<InfoCircleOutline class="h-4 w-4" color="white" />
</span>
<Tooltip class="max-w-[500px] font-light">
	<slot />
</Tooltip>

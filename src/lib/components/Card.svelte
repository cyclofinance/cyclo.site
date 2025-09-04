<script lang="ts">
	import { Card, type SizeType } from 'flowbite-svelte';
	export let size: SizeType = 'xl';
	export let customClass = '';
</script>

<Card
	{size}
	data-testid="card"
	class={'border-outset flex flex-col items-center gap-6 overflow-x-hidden rounded-none border-4 border-white bg-primary p-4 text-white shadow-md' +
		' ' +
		customClass}
>
	<slot />
</Card>

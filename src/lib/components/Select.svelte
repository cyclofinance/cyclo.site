<script lang="ts">
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let options: any[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let selected: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let getOptionLabel: (option: any) => string;
</script>

<select class="rounded border border-white bg-transparent px-2 py-1" bind:value={selected}>
	{#each options as option}
		<option value={option}>
			{getOptionLabel(option)}
		</option>
	{/each}
</select>

<script lang="ts" generics="T">
	// eslint-disable-next-line
	export let options: T[];
	// eslint-disable-next-line
	export let selected: T;
	// eslint-disable-next-line
	export let getOptionLabel: (option: T) => string;
</script>

<select class="rounded border border-white bg-transparent px-2 py-1" bind:value={selected}>
	{#each options as option}
		<option value={option}>
			{getOptionLabel(option)}
		</option>
	{/each}
</select>

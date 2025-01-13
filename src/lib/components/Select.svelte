<script lang="ts">
	export let options: any[];
	export let selected: any;
	export let getOptionLabel: (option: any) => string;
</script>

<select class="rounded border border-white bg-transparent px-2 py-1" bind:value={selected}>
	{#each options as option}
		<option value={option}>
			{getOptionLabel(option)}
		</option>
	{/each}
</select>

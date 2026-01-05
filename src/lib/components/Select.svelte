<script lang="ts" generics="T">
	// eslint-disable-next-line
	export let options: T[];
	// eslint-disable-next-line
	export let selected: T;
	// eslint-disable-next-line
	export let getOptionLabel: (option: T) => string;

	export let dataTestId: string = '';

	// Ensure selected is in options, or default to first option
	$: if (options.length > 0 && (!selected || !options.includes(selected))) {
		selected = options[0];
	}
</script>

{#if options.length > 0}
	<select
		class="rounded border border-white bg-transparent px-2 py-1"
		bind:value={selected}
		data-testid={dataTestId}
	>
		{#each options as option}
			<option value={option}>
				{getOptionLabel(option)}
			</option>
		{/each}
	</select>
{/if}

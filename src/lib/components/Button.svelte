<script lang="ts">
	export let inset: boolean = false;
	export let dataTestId: string = '';
</script>

<button {...$$restProps} on:click class:inset class:outset={!inset} data-testid={dataTestId}
	><slot /></button
>

<style lang="postcss">
	button {
		@apply flex items-center justify-center gap-2 border-4 border-white bg-primary px-2 py-1 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-neutral-600 md:px-4 md:py-2;
	}

	.outset {
		border-style: outset;
	}

	.inset {
		border-style: inset;
	}

	button:disabled {
		@apply cursor-not-allowed;
		border-style: solid;
	}
</style>

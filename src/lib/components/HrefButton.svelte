<script lang="ts">
	export let inset: boolean = false;
	export let href: string;
</script>

<a {...$$restProps} {href} class:inset class:outset={!inset}><slot /></a>

<style lang="postcss">
	a {
		@apply flex items-center justify-center gap-2 border-4 border-white bg-primary px-2 py-1 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-neutral-600 md:px-4 md:py-2;
	}

	.outset {
		border-style: outset;
	}

	.inset {
		border-style: inset;
	}

	a:disabled {
		@apply cursor-not-allowed;
		border-style: solid;
	}
</style>

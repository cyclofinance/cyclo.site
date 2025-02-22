<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	export let launched: boolean;
</script>

<div class="flex items-center justify-center gap-4 sm:hidden">
	{#if launched}
		<a
			href={base + '/lock'}
			data-testid="app-button-mobile"
			class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
			class:hidden={$page.url.pathname === '/lock' || $page.url.pathname === '/unlock'}
		>
			App
		</a>
	{/if}
	<a
		href={base + '/docs'}
		data-testid="docs-button-mobile"
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:hidden={$page.url.pathname.startsWith('/docs') || $page.url.pathname === '/'}
	>
		Docs
	</a>
	<a
		href={base + '/rewards'}
		data-testid="rewards-button-mobile"
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:hidden={$page.url.pathname === '/rewards'}
	>
		Rewards
	</a>
</div>

<div class="hidden items-center justify-center gap-4 sm:flex">
	{#if launched}
		<a
			href={base + '/lock'}
			data-testid="app-button"
			class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
			class:underline={$page.url.pathname === '/lock' || $page.url.pathname === '/unlock'}
		>
			App
		</a>
	{/if}
	<a
		href={base + '/docs'}
		data-testid="docs-button"
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:underline={$page.url.pathname.startsWith('/docs')}
	>
		Docs
	</a>
	<a
		href={base + '/rewards'}
		data-testid="rewards-button"
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:underline={$page.url.pathname === '/rewards'}
	>
		Rewards
	</a>
</div>

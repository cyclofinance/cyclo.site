<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	export let launched: boolean;
</script>

<div class="flex items-center justify-center gap-4 sm:hidden">
	{#if launched}
		<button
			data-testid="app-button-mobile"
			class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
			class:hidden={$page.url.pathname === '/lock' || $page.url.pathname === '/unlock'}
			on:click={() => {
				goto(base + '/lock');
			}}>App</button
		>
	{/if}
	<button
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:hidden={$page.url.pathname.startsWith('/docs') || $page.url.pathname === '/'}
		on:click={() => {
			goto(base + '/docs');
		}}>Docs</button
	>
	<button
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:hidden={$page.url.pathname === '/rewards'}
		on:click={() => {
			goto(base + '/rewards');
		}}>Rewards</button
	>
</div>

<div class="hidden items-center justify-center gap-4 sm:flex">
	{#if launched}
		<button
			data-testid="app-button"
			class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
			class:underline={$page.url.pathname === '/lock' || $page.url.pathname === '/unlock'}
			on:click={() => {
				goto(base + '/lock');
			}}>App</button
		>
	{/if}
	<button
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:underline={$page.url.pathname.startsWith('/docs')}
		on:click={() => {
			goto(base + '/docs');
		}}>Docs</button
	>
	<button
		class="text-lg text-white sm:ml-4 sm:block sm:text-xl"
		class:underline={$page.url.pathname === '/rewards'}
		on:click={() => {
			goto(base + '/rewards');
		}}>Rewards</button
	>
</div>

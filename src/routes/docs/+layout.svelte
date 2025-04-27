<script lang="ts">
	import type { LayoutData } from './$types';
	import { BarsOutline } from 'flowbite-svelte-icons';
	export let data: LayoutData;

	let mobileMenuOpen = false;
	const toggleMenu = () => {
		mobileMenuOpen = !mobileMenuOpen;
	};
</script>

<div
	class="sticky top-0 z-[999] flex h-[var(--header-height)] flex-row items-center gap-x-2 border-b bg-white px-2 py-6 text-black md:hidden md:p-4"
>
	<BarsOutline
		class="block cursor-pointer"
		size="xl"
		withEvents
		on:click={toggleMenu}
		data-testid="menu-icon"
	/>
</div>
<div class="z-0 flex flex-col bg-white text-black md:flex-row">
	<div
		data-testid="side-menu"
		class:left-0={mobileMenuOpen}
		class="fixed -left-full z-[999] h-[calc(100vh-var(--header-height))] w-full min-w-80 overflow-auto border-b bg-white p-4 transition-all md:sticky md:left-0 md:top-[var(--header-height)] md:w-80 md:border-r"
	>
		<ul class="container flex flex-col gap-y-8 md:mx-auto">
			{#each data.categorisedArticles as { articles }}
				<li class="flex flex-col gap-y-2">
					{#each articles as { slug, title }}
						<a on:click={toggleMenu} data-testid="doc-title" href={`${slug}`}>{title}</a>
					{/each}
				</li>
			{/each}
		</ul>
	</div>
	<div>
		<div class="prose prose-neutral max-w-[100ch] p-4 md:p-8">
			<slot />
		</div>
	</div>
</div>

<style>
	:root {
		--header-height: 0px;
	}
</style>

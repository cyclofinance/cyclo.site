<script lang="ts">
	import WalletConnect from './WalletConnect.svelte';
	import logo from '$lib/images/logo-white.svg';
	import spiralLogo from '$lib/images/spiral-logo.svg';
	import { base } from '$app/paths';
	import SocialLinks from './SocialLinks.svelte';
	import NavButtons from './NavButtons.svelte';

	export let launched: boolean;
	// A private, single-page build of the position manager carries no site
	// navigation (set from PUBLIC_MANAGER_HOME in the layout). Default keeps all.
	export let managerOnly = false;
</script>

<div class="flex h-16 w-full items-center justify-between bg-page px-4">
	<div class="mr-4 flex items-center justify-center gap-4">
		<a href={base + '/'} class="hidden sm:block">
			<img src={logo} alt="Cyclo logo" class="h-8 cursor-pointer" />
		</a>
		<a href={base + '/'} class="block sm:hidden">
			<img src={spiralLogo} alt="Cyclo spiral logo" class="h-8 cursor-pointer" />
		</a>
		{#if !managerOnly}
			<NavButtons {launched} />
		{/if}
	</div>
	<div class="flex items-center justify-center gap-4">
		{#if !managerOnly}
			<SocialLinks />
		{/if}
		<WalletConnect />
	</div>
</div>

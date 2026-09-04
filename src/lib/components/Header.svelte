<script lang="ts">
	import WalletConnect from './WalletConnect.svelte';
	import logo from '$lib/images/logo-white.svg';
	import spiralLogo from '$lib/images/spiral-logo.svg';
	import { base } from '$app/paths';
</script>

<div class="flex h-16 w-full items-center justify-between bg-page px-4">
	<a href={base + '/'} class="hidden sm:block">
		<img src={logo} alt="Cyclo logo" class="h-8 cursor-pointer" />
	</a>
	<a href={base + '/'} class="block sm:hidden">
		<img src={spiralLogo} alt="Cyclo spiral logo" class="h-8 cursor-pointer" />
	</a>
	<WalletConnect />
</div>

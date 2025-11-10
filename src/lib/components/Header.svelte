<script lang="ts">
	import WalletConnect from './WalletConnect.svelte';
	import logo from '$lib/images/logo-white.svg';
	import spiralLogo from '$lib/images/spiral-logo.svg';
	import { base } from '$app/paths';
	import SocialLinks from './SocialLinks.svelte';
	import NavButtons from './NavButtons.svelte';
	import NetworkSwitcher from './NetworkSwitcher.svelte';

	export let launched: boolean;
</script>

<div class="flex h-16 w-screen items-center justify-between bg-[#1C02B8] px-4">
	<div class="mr-4 flex items-center justify-center gap-4">
		<a href={base + '/'} class="hidden sm:block">
			<img src={logo} alt="Cyclo logo" class="h-8 cursor-pointer" />
		</a>
		<a href={base + '/'} class="block sm:hidden">
			<img src={spiralLogo} alt="Cyclo spiral logo" class="h-8 cursor-pointer" />
		</a>
		<NavButtons {launched} />
	</div>
	<div class="flex items-center justify-center gap-4">
		<NetworkSwitcher />
		<SocialLinks />
		<WalletConnect />
	</div>
</div>

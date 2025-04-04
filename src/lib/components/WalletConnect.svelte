<script lang="ts">
	import { targetNetwork, wrongNetwork } from '$lib/stores';
	import { web3Modal, signerAddress, connected } from 'svelte-wagmi';
	import { CheckCircleSolid, CloseCircleSolid } from 'flowbite-svelte-icons';
	import Button from './Button.svelte';
</script>

<Button on:click={() => $web3Modal.open()} tabindex={0} dataTestId="wallet-connect">
	{#if $wrongNetwork || !$signerAddress || !$connected}
		<div data-testid="not-connected">
			<CloseCircleSolid color="red" class="hidden md:inline" />
			<span>Connect</span><span class="hidden md:inline">{''} to {$targetNetwork.name}</span>
		</div>
	{:else}
		<div data-testid="connected">
			<CheckCircleSolid color="green" class="hidden md:inline" />
			<span>Connected</span><span class="hidden md:inline">{''} to {$targetNetwork.name}</span>
		</div>
	{/if}
</Button>

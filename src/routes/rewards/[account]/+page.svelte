<script lang="ts">
	import AccountStatus from '$lib/components/AccountStatus.svelte';
	import Card from '$lib/components/Card.svelte';
	import { page } from '$app/stores';
	import { wagmiConfig } from 'svelte-wagmi';
	import {
		selectedCyToken,
		tokens,
		selectedNetwork,
		isFlareNetwork,
		setActiveNetwork
	} from '$lib/stores';
	import { switchNetwork } from '@wagmi/core';
	import { flare } from '@wagmi/core/chains';
	import { browser } from '$app/environment';

	$: if ($tokens.length > 0 && !$selectedCyToken) {
		$selectedCyToken = $tokens[0];
	}

	$: isFlare = isFlareNetwork($selectedNetwork);
	$: networkKey = $selectedNetwork.chain.id; // Track network changes for re-rendering

	let hasTriggeredReload = false;
	let isSwitchingNetwork = false;

	// Ensure rewards page runs on Flare: auto-switch app + wallet when not on Flare
	$: if (!isFlare && !hasTriggeredReload) {
		hasTriggeredReload = true;
		isSwitchingNetwork = true;
		setActiveNetwork('flare');
		const config = $wagmiConfig;
		if (config) {
			switchNetwork(config, { chainId: flare.id })
				.then(() => {
					// Reload page after network switch to ensure fresh state
					if (browser) {
						setTimeout(() => {
							window.location.reload();
						}, 1000);
					}
				})
				.catch((error) => {
					console.warn('Failed to switch wallet network to flare:', error);
					hasTriggeredReload = false; // Reset flag on error so it can retry
					isSwitchingNetwork = false; // Reset loading state on error
				});
		} else {
			// If no config, still reload after setting network
			if (browser) {
				setTimeout(() => {
					window.location.reload();
				}, 500);
			}
		}
	}

	// Reset reload flag when network becomes Flare
	$: if (isFlare) {
		hasTriggeredReload = false;
		isSwitchingNetwork = false;
	}
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	{#if isSwitchingNetwork}
		<Card customClass="items-stretch">
			<div
				class="flex flex-col items-center justify-center space-y-4 py-12"
				data-testid="network-switching"
			>
				<div
					class="h-8 w-8 animate-spin rounded-full border-b-2 border-white sm:h-12 sm:w-12"
				></div>
				<div class="flex flex-col gap-2 text-center">
					<h2 class="text-xl font-semibold text-white">Switching Network</h2>
					<p class="text-gray-300">
						Switching to Flare network. Please approve the network switch in your wallet.
					</p>
					<p class="text-sm text-gray-400">
						Current network: <span class="font-semibold">{$selectedNetwork.chain.name}</span>
					</p>
				</div>
			</div>
		</Card>
	{:else}
		{#key networkKey}
			{#if isFlare}
				<AccountStatus account={$page.params.account} />
			{:else}
				<Card customClass="items-stretch">
					<div class="space-y-6" data-testid="account-status-network-unavailable">
						<div class="flex flex-col gap-2">
							<h2 class="text-xl font-semibold text-white">Account Status Unavailable</h2>
							<p class="text-gray-300">
								Account rewards status is currently only available on Flare network. Please switch
								to Flare to view account information.
							</p>
							<p class="text-sm text-gray-400">
								Current network: <span class="font-semibold">{$selectedNetwork.chain.name}</span>
							</p>
							<p class="text-sm text-gray-400">
								Account: <span class="font-mono">{$page.params.account}</span>
							</p>
						</div>
					</div>
				</Card>
			{/if}
		{/key}
	{/if}
</div>

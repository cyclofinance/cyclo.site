<script lang="ts">
	import AccountStatus from '$lib/components/AccountStatus.svelte';
	import Card from '$lib/components/Card.svelte';
	import { page } from '$app/stores';
	import { activeNetworkKey, activeNetworkConfig } from '$lib/stores';
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	{#if $activeNetworkKey === 'flare'}
		<AccountStatus account={$page.params.account} />
	{:else}
		<Card customClass="items-stretch">
			<div class="space-y-6" data-testid="account-status-network-unavailable">
				<div class="flex flex-col gap-2">
					<h2 class="text-xl font-semibold text-white">Account Status Unavailable</h2>
					<p class="text-gray-300">
						Account rewards status is currently only available on Flare network. Please switch to
						Flare to view account information.
					</p>
					<p class="text-sm text-gray-400">
						Current network: <span class="font-semibold">{$activeNetworkConfig.displayName}</span>
					</p>
					<p class="text-sm text-gray-400">
						Account: <span class="font-mono">{$page.params.account}</span>
					</p>
				</div>
			</div>
		</Card>
	{/if}
</div>

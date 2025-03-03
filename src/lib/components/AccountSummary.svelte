<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchAccountStatus } from '$lib/queries/fetchAccountStatus';
	import Card from './Card.svelte';
	import type { AccountStats } from '$lib/types';
	import AccountStatsComponent from './AccountStats.svelte';

	export let account: string;

	let loading = true;
	let error: string | null = null;
	let stats: AccountStats | null = null;

	onMount(async () => {
		try {
			stats = await fetchAccountStatus(account);
			loading = false;
		} catch (e) {
			console.error(e);
			error = e instanceof Error ? e.message : 'Failed to fetch account status';
			loading = false;
		}
	});
</script>

<Card>
	{#if loading}
		<div class="flex min-h-[200px] items-center justify-center" data-testid="loader">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
		</div>
	{:else if error}
		<div class="text-error bg-error/10 rounded-lg p-4">
			{error}
		</div>
	{:else if stats}
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white">Your Rewards</h2>
				<a
					href={`/rewards/${account}`}
					data-testid="full-tx-history-button"
					class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90"
				>
					Full Tx History
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</a>
			</div>

			<AccountStatsComponent {stats} />
		</div>
	{/if}
</Card>

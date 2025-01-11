<script lang="ts">
	import Card from './Card.svelte';
	import { web3Modal } from 'svelte-wagmi';
	import { base } from '$app/paths';
</script>

<Card customClass="items-stretch">
	<div class="space-y-6" data-testid="rewards-placeholder">
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white">Your Rewards</h2>
			</div>
			<a href={base + '/docs/rewards'} class="text-sm text-primary hover:underline" target="_blank">
				How are rewards calculated?
			</a>
		</div>

		<button
			data-testid="connect-message"
			class="flex min-h-[100px] w-full items-center justify-center gap-2 text-gray-300 hover:text-gray-100"
			on:click={() => $web3Modal.open()}
		>
			Connect your wallet to see your rewards
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
		</button>
	</div>
</Card>

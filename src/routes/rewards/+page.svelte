<script lang="ts">
	import AccountSummary from '$lib/components/AccountSummary.svelte';
	import RewardsPlaceholder from '$lib/components/RewardsPlaceholder.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import RewardsInfo from '$lib/components/RewardsInfo.svelte';
	import StatsPanel from '$lib/components/StatsPanel.svelte';
	import { signerAddress } from 'svelte-wagmi';
	import { cusdxAddress, quoterAddress } from '$lib/stores';

	const cysFLR = {
		name: 'cysFLR',
		address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567',
		underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB',
		underlyingSymbol: 'sFLR',
		receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09'
	};
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	<StatsPanel />
	<RewardsInfo />
	{#if $signerAddress}
		<AccountSummary account={$signerAddress} />
	{:else}
		<RewardsPlaceholder />
	{/if}
	<Leaderboard />
</div>

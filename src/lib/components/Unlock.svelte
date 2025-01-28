<script lang="ts">
	import { signerAddress, wagmiConfig, web3Modal } from 'svelte-wagmi';
	import Card from '$lib/components/Card.svelte';
	import { refreshAllReceipts } from '$lib/queries/refreshAllReceipts';
	import { formatEther } from 'ethers';
	import ReceiptsTable from '$lib/components/ReceiptsTable.svelte';
	import Button from '$lib/components/Button.svelte';
	import balancesStore from '$lib/balancesStore';
	import { fade } from 'svelte/transition';
	import { selectedCyToken, tokens } from '$lib/stores';
	import { myReceipts } from '$lib/stores';
	import type { Hex } from 'viem';

	let loading = true;
	const setLoading = (_loading: boolean) => {
		loading = _loading;
	};

	$: if ($signerAddress) {
		refreshAllReceipts($signerAddress, $wagmiConfig, setLoading);
		balancesStore.refreshBalances($wagmiConfig, $signerAddress as Hex);
	}
</script>

{#if !$signerAddress}
	<Button on:click={() => $web3Modal.open()} class=" w-fit text-lg md:text-xl"
		>CONNECT WALLET TO VIEW RECEIPTS</Button
	>
{:else}
	{#key [$myReceipts, $selectedCyToken]}
		<Card size="lg">
			<div
				class=" flex w-full flex-col justify-between font-semibold text-white sm:flex-row sm:text-xl md:text-xl"
			>
				<span>BALANCES</span>
				<div class="flex flex-col gap-4 sm:items-end">
					{#each ['cysFLR', 'cyWETH'] as token}
						<div class="flex flex-row gap-2" data-testid="{token.toLowerCase()}-balance">
							{#key $balancesStore.balances[token]?.signerBalance}
								<span in:fade={{ duration: 700 }}>
									{formatEther($balancesStore.balances[token]?.signerBalance || 0n)}
								</span>
							{/key}
							<span>{token}</span>
						</div>
					{/each}
				</div>
			</div>
		</Card>

		<!-- Tabs for different token receipts -->
		<div class="flex gap-4 text-white">
			{#each tokens as token}
				<button
					data-testid="{token.name}-button"
					class="w-24 sm:w-32 {$selectedCyToken.name === token.name
						? 'bg-white text-primary'
						: 'border border-white'}"
					on:click={() => ($selectedCyToken = token)}
				>
					{token.name}
				</button>
			{/each}
		</div>

		{#if loading}
			<div
				class=" flex w-full items-center justify-center text-center text-lg font-semibold text-white md:text-xl"
			>
				LOADING...
			</div>
		{:else if $myReceipts.length > 0}
			<ReceiptsTable
				token={$selectedCyToken}
				receipts={$myReceipts.filter((receipt) => receipt.token === $selectedCyToken.name)}
			/>
		{:else if !$myReceipts.length}
			<div
				class=" flex w-full items-center justify-center text-center text-lg font-semibold text-white md:text-xl"
			>
				NO {$selectedCyToken.name} RECEIPTS FOUND...
			</div>
		{/if}
	{/key}
{/if}

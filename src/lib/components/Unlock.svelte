<script lang="ts">
	import { signerAddress, web3Modal } from 'svelte-wagmi';
	import Card from '$lib/components/Card.svelte';
	import { refreshAllReceipts } from '$lib/queries/refreshAllReceipts';
	import { formatUnits } from 'ethers';
	import ReceiptsTable from '$lib/components/ReceiptsTable.svelte';
	import Button from '$lib/components/Button.svelte';
	import balancesStore from '$lib/balancesStore';
	import { fade } from 'svelte/transition';
	import { selectedCyToken, tokens, selectedNetwork } from '$lib/stores';
	import { myReceipts } from '$lib/stores';

	let loading = true;
	let progressMessage = '';

	const setLoading = (_loading: boolean) => {
		loading = _loading;
	};

	// Track previous values to prevent unnecessary re-fetches
	let previousSignerAddress: string | null = null;
	let previousNetworkKey: string | undefined = undefined;
	let isRefreshing = false;

	// Only refresh when signer address or network actually changes
	$: if (
		$signerAddress &&
		$selectedNetwork &&
		$selectedNetwork.rewardsSubgraphUrl &&
		($signerAddress !== previousSignerAddress || $selectedNetwork.key !== previousNetworkKey) &&
		!isRefreshing
	) {
		isRefreshing = true;
		previousSignerAddress = $signerAddress;
		previousNetworkKey = $selectedNetwork.key;

		refreshAllReceipts($signerAddress, setLoading).finally(() => {
			isRefreshing = false;
		});
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
					{#each $tokens as token}
						<div class="flex flex-row gap-2" data-testid="{token.symbol.toLowerCase()}-balance">
							{#key $balancesStore.balances[token.name]?.signerBalance}
								<span in:fade={{ duration: 700 }}>
									{formatUnits(
										$balancesStore.balances[token.name]?.signerBalance || 0n,
										token.decimals
									)}
								</span>
							{/key}
							<span>{token.symbol}</span>
						</div>
					{/each}
				</div>
			</div>
		</Card>

		<!-- Tabs for different token receipts -->
		<!-- Tabs for different token receipts -->
		<div class="token-grid text-white">
			{#each $tokens as token (token.address)}
				<button
					data-testid="{token.name}-button"
					class="token-button {$selectedCyToken.name === token.name ? 'active' : ''}"
					on:click={() => ($selectedCyToken = token)}
				>
					{token.name}
				</button>
			{/each}
		</div>

		{#if loading}
			<div
				class=" flex w-full flex-col items-center justify-center text-center text-lg font-semibold text-white md:text-xl"
			>
				<div>LOADING...</div>
				{#if progressMessage}
					<div class="mt-2 text-sm text-gray-300">
						{progressMessage}
					</div>
				{/if}
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

<style>
	.token-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	@media (max-width: 1024px) {
		.token-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 540px) {
		.token-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.token-button {
		width: 100%;
		min-height: 40px;
		padding: 0.5rem 0.75rem;
		border: 1px solid white;
		background: transparent;
		text-align: center;
	}

	.token-button.active {
		background: white;
		color: #1a1a4b;
	}

	@media (max-width: 500px) {
		.token-button {
			font-size: 0.85rem;
			min-height: 36px;
		}
	}
</style>

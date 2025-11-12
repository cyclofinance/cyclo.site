<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import transactionStore from '$lib/transactionStore';
	import { RefreshOutline } from 'flowbite-svelte-icons';
	import balancesStore from '$lib/balancesStore';
	import Input from '$lib/components/Input.svelte';
	import { cusdxAddress, selectedCyToken } from '$lib/stores';
	import { base } from '$app/paths';
	import mintDia from '$lib/images/mint-dia.svg';
	import mintMobile from '$lib/images/mint-mobile.svg';
	import mintMobileSquiggle from '$lib/images/mint-mobile-squiggle.svg';
	import ftso from '$lib/images/ftso.svg';
	import Button from '$lib/components/Button.svelte';
	import { Modal } from 'flowbite-svelte';
	import { signerAddress, wagmiConfig, web3Modal } from 'svelte-wagmi';
	import { fade } from 'svelte/transition';
	import { formatEther, formatUnits } from 'ethers';
	import Select from './Select.svelte';
	import { tokens } from '$lib/stores';
	import { parseUnits, type Hex } from 'viem';
	import { arbitrum } from '@wagmi/core/chains';

	export let amountToLock = '';
	let disclaimerAcknowledged = false;
	let disclaimerOpen = false;

	enum ButtonStatus {
		READY = 'LOCK'
	}

	$: assets = BigInt(0);
	$: insufficientFunds =
		($balancesStore.balances[$selectedCyToken.name]?.signerUnderlyingBalance || 0n) < assets;
	$: buttonStatus = !amountToLock
		? ButtonStatus.READY
		: insufficientFunds
			? `INSUFFICIENT ${$selectedCyToken.underlyingSymbol}`
			: ButtonStatus.READY;

	$: if ($signerAddress) {
		checkBalance();
	}

	const checkBalance = () => {
		if (amountToLock) {
			const bigNumValue = BigInt(
				parseUnits(amountToLock.toString(), $selectedCyToken.decimals).toString()
			);
			assets = bigNumValue;
			insufficientFunds =
				($balancesStore.balances[$selectedCyToken.name]?.signerUnderlyingBalance || 0n) < assets;
		}
	};

	const initiateLockWithDisclaimer = () => {
		if (!disclaimerAcknowledged) {
			disclaimerOpen = true;
		} else {
			runLockTransaction();
		}
	};

	const runLockTransaction = () => {
		transactionStore.handleLockTransaction({
			signerAddress: $signerAddress,
			config: $wagmiConfig,
			selectedToken: $selectedCyToken,
			assets: assets
		});
	};

	const refreshSelectedTokenData = async () => {
		if ($selectedCyToken?.chainId === arbitrum.id) {
			transactionStore.handlePythPriceUpdate();
		}
	};
	let refreshing = false;

	$: if (assets || amountToLock) {
		balancesStore.refreshDepositPreviewSwapValue(
			$wagmiConfig,
			$selectedCyToken,
			$cusdxAddress,
			assets
		);
	}
	// Also refresh prices when selected token changes
	$: if ($selectedCyToken && $selectedCyToken.address) {
		if ($signerAddress) {
			balancesStore.refreshBalances($wagmiConfig, $signerAddress as Hex);
		}
		balancesStore.refreshPrices($wagmiConfig, $selectedCyToken);
	}
</script>

<Card size="lg">
	<div class="flex w-full flex-col items-center justify-center gap-10" data-testid="lock-container">
		<div
			class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
		>
			<span>SELECT TOKEN</span>
			<Select
				options={$tokens}
				bind:selected={$selectedCyToken}
				getOptionLabel={(option) => `${option.symbol} · ${option.networkName}`}
			/>
		</div>

		{#if $signerAddress}
			<div
				class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
			>
				<span>{$selectedCyToken.underlyingSymbol} BALANCE</span>

				<div class="flex flex-row gap-4">
					<span data-testid="your-balance">
						{formatUnits(
							$balancesStore.balances[$selectedCyToken.name]?.signerUnderlyingBalance || 0n,
							$selectedCyToken.decimals
						)}
					</span>
				</div>
			</div>
		{/if}

		<div
			class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
		>
			<div class="flex flex-col gap-0">
				<span>cy{$selectedCyToken.underlyingSymbol} PER {$selectedCyToken.underlyingSymbol}</span>
				<a
					href={base + '/docs/why-flare'}
					class="cursor-pointer text-xs font-light hover:underline"
					target="_blank"
					data-testid="price-ratio-link">How does Cyclo use the FTSO?</a
				>
			</div>
			<div in:fade class="flex items-center gap-2">
				{#key $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
					<span
						in:fade={{ duration: 700 }}
						class="flex flex-row items-center gap-2"
						data-testid="price-ratio"
					>
						{#if $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
							{Number(
								formatEther($balancesStore.stats[$selectedCyToken.name].lockPrice)
							).toString()}
						{:else}
							Stale or Incorrect price
						{/if}
						{#if $selectedCyToken?.chainId === arbitrum.id}
							<button
								class="refresh-button rounded border border-white/40 px-2 py-1 text-xs font-medium text-white transition hover:border-white hover:text-white/80 disabled:opacity-60"
								on:click={refreshSelectedTokenData}
								disabled={refreshing}
								type="button"
							>
								<RefreshOutline class="h-4 w-4" />
							</button>
						{:else}
							<svg width="20" height="20" viewBox="0 0 100 100">
								<circle cx="50" cy="50" r="45" stroke="none" stroke-width="10" fill="none" />
								<circle
									class="fill-circle"
									cx="50"
									cy="50"
									r="45"
									stroke="white"
									stroke-width="10"
									fill="none"
									stroke-dasharray="282 282"
								/>
							</svg>
						{/if}
					</span>
				{/key}
			</div>
		</div>

		<div
			class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
		>
			<span>LOCK AMOUNT</span>
			<div class="flex flex-col">
				<Input
					dataTestId="lock-input"
					on:input={(event) => {
						amountToLock = event.detail.value;
						checkBalance();
					}}
					on:setValueToMax={() => {
						const balance =
							$balancesStore.balances[$selectedCyToken.name]?.signerUnderlyingBalance || 0n;
						assets = balance;
						amountToLock = Number(formatUnits(balance, $selectedCyToken.decimals)).toString();
					}}
					bind:amount={amountToLock}
					maxValue={$balancesStore.balances[$selectedCyToken.name]?.signerUnderlyingBalance || 0n}
					unit={$selectedCyToken.underlyingSymbol}
					maxButton
				/>
				{#if $signerAddress}
					<p
						class="my-2 text-left text-xs font-light sm:text-right"
						data-testid="underlying-balance"
					>
						{$selectedCyToken.underlyingSymbol} Balance: {formatUnits(
							$balancesStore.balances[$selectedCyToken.name]?.signerUnderlyingBalance || 0n,
							$selectedCyToken.decimals
						)}
					</p>
				{:else}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						on:click={() => $web3Modal.open()}
						class="my-2 cursor-pointer text-right text-xs font-light hover:underline"
						data-testid="connect-message"
					>
						Connect a wallet to see {$selectedCyToken.underlyingSymbol} balance
					</div>
				{/if}
			</div>
		</div>

		<!-- Mint diagram for desktop -->
		<div class="hidden w-full flex-col gap-2 sm:flex">
			<div
				class="flex w-full flex-row items-center justify-center gap-2 text-center text-lg font-semibold text-white sm:flex-col sm:text-xl"
			>
				<span>{amountToLock || '0'}</span>

				<span>{$selectedCyToken.underlyingSymbol}</span>
			</div>

			<div class="flex w-full">
				<div
					class="flex w-1/4 flex-col items-center justify-center pb-12 pl-6 pr-2 text-center text-white"
				>
					<img src={ftso} alt="ftso" class="w-1/2" />
					{#key $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
						<span class="text-sm">
							{#if $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
								{formatEther($balancesStore.stats[$selectedCyToken.name].lockPrice)}
							{:else}
								Stale or Incorrect price
							{/if}
						</span>
					{/key}
				</div>
				<img src={mintDia} alt="diagram" class="w-1/2" />
				<div class="w-1/4"></div>
			</div>

			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white sm:text-xl"
			>
				{#key $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
					<span class="text-base" data-testid="calculated-cysflr"
						>{#if $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
							{!amountToLock
								? '0'
								: formatUnits($balancesStore.swapQuotes.cyTokenOutput, $selectedCyToken.decimals)}
						{:else}
							Stale Price / Incorrect price
						{/if}</span
					>
				{/key}
				<span>{$selectedCyToken.name}</span>
			</div>
			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white sm:text-xl"
			>
				<span class="text-sm" data-testid="calculated-cysflr-usd"
					>Current market value ~$ {amountToLock
						? formatUnits($balancesStore.swapQuotes.cusdxOutput, 6)
						: '0'}</span
				>
			</div>
		</div>

		<!-- Mint diagram for mobile -->
		<div class="flex w-full flex-col items-center gap-2 sm:hidden">
			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white md:text-2xl"
			>
				<span>{amountToLock || '0'}</span>

				<span>{$selectedCyToken.underlyingSymbol}</span>
			</div>
			<img src={mintMobileSquiggle} alt="diagram" class="h-12" />
			<div class="flex w-1/4 flex-col items-center justify-center text-center text-white">
				<img src={ftso} alt="ftso" class="" />
				{Number(formatEther($balancesStore.stats[$selectedCyToken.name].lockPrice.toString()))}
			</div>
			<img src={mintMobile} alt="diagram" class="h-60" />
			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white md:text-2xl"
			>
				{#key $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
					<span class="text-base" data-testid="calculated-cysflr-mobile"
						>{#if $balancesStore.stats[$selectedCyToken.name]?.lockPrice}
							{!amountToLock ? '0' : formatEther($balancesStore.swapQuotes.cyTokenOutput)}
						{:else}
							Stale Price / Incorrect price
						{/if}}</span
					>
				{/key}
				<span>{$selectedCyToken.name}</span>
			</div>
			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white sm:text-xl"
			>
				<span class="text-sm" data-testid="calculated-cysflr-usd-mobile"
					>Current market value ~$ {amountToLock
						? formatUnits($balancesStore.swapQuotes.cusdxOutput, 6)
						: '0'}</span
				>
			</div>
		</div>

		{#if $signerAddress}
			<Button
				disabled={insufficientFunds || !assets || !amountToLock}
				customClass="sm:text-xl text-lg w-full bg-white text-primary"
				dataTestId="lock-button"
				on:click={() => initiateLockWithDisclaimer()}>{buttonStatus}</Button
			>
		{:else}
			<Button
				customClass="text-lg"
				data-testid="connect-wallet-button"
				on:click={() => $web3Modal.open()}>CONNECT WALLET</Button
			>
		{/if}
	</div>
</Card>

<Modal
	size="sm"
	open={disclaimerOpen}
	on:close={() => (disclaimerOpen = false)}
	data-testid="disclaimer-modal"
>
	<div class="p-1 text-center sm:p-4">
		<h2 class="mb-4 text-lg font-semibold text-red-600">Wait!</h2>
		<p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
			Before you lock your {$selectedCyToken.underlyingSymbol}, make sure you understand the
			following:
		</p>
		<ul
			class="mb-4 flex flex-col gap-1 pl-1 text-left text-xs text-gray-700 dark:text-gray-300 sm:pl-4"
		>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				This front end is a tool for interacting with the Cyclo smart contracts.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				You are depositing funds using your own wallet and private keys.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				No custodianship of funds exists; they are held by the smart contract.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				Smart contracts are immutable and cannot be upgraded or modified. Cyclo has been audited, however
				this does not guarantee there are no bugs or other vulnerabilities.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				The protocol is fully autonomous; there are no admin controls or governance.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				Cyclo relies on oracles to determine the ${$selectedCyToken.underlyingSymbol}/USD price.
				These are maintained by providers on {$selectedCyToken.networkName}.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				You must keep your receipt tokens safe to unlock your ${$selectedCyToken.underlyingSymbol}.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				The value of ${$selectedCyToken.name} is determined solely by market forces.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				Do not proceed if you do not understand the transaction you are signing.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				Only invest funds you can afford to lose.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				Verify the smart contract addresses match the official documentation.
			</li>
		</ul>
		<p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
			For more information on risks, please see the <a href={base + '/docs/risks'}>Risks</a> section
			of the documentation.
		</p>
		<div class="flex w-full justify-center">
			<Button
				class="mt-4  text-white"
				on:click={() => {
					disclaimerAcknowledged = true;
					disclaimerOpen = false;
					runLockTransaction();
				}}
				dataTestId="disclaimer-acknowledge-button"
			>
				ACKNOWLEDGE AND LOCK
			</Button>
		</div>
	</div>
</Modal>

<style lang="postcss">
	.fill-circle {
		animation: fillAnimation 3s ease-out infinite;
		transform: rotate(-90deg);
		transform-origin: 50% 50%;
	}
	@keyframes fillAnimation {
		0% {
			stroke-dasharray: 0 282;
		}
		100% {
			stroke-dasharray: 282 0;
		}
	}
	.refresh-icon {
		width: 20px;
		height: 20px;
	}
</style>

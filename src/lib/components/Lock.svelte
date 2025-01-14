<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import transactionStore from '$lib/transactionStore';
	import balancesStore from '$lib/balancesStore';
	import Input from '$lib/components/Input.svelte';
	import {
		cusdxAddress,
		cysFlrAddress,
		erc1155Address,
		quoterAddress,
		sFlrAddress
	} from '$lib/stores';
	import { base } from '$app/paths';
	import mintDia from '$lib/images/mint-dia.svg';
	import mintMobile from '$lib/images/mint-mobile.svg';
	import mintMobileSquiggle from '$lib/images/mint-mobile-squiggle.svg';
	import ftso from '$lib/images/ftso.svg';
	import Button from '$lib/components/Button.svelte';
	import { Modal } from 'flowbite-svelte';
	import { signerAddress, wagmiConfig, web3Modal } from 'svelte-wagmi';
	import { fade } from 'svelte/transition';
	import { formatEther, formatUnits, parseEther } from 'ethers';

	export let amountToLock = '';
	let disclaimerAcknowledged = false;
	let disclaimerOpen = false;

	enum ButtonStatus {
		INSUFFICIENT_sFLR = 'INSUFFICIENT sFLR',
		READY = 'LOCK'
	}

	$: assets = BigInt(0);
	$: insufficientFunds = $balancesStore.sFlrBalance < assets;
	$: buttonStatus = !amountToLock
		? ButtonStatus.READY
		: insufficientFunds
			? ButtonStatus.INSUFFICIENT_sFLR
			: ButtonStatus.READY;

	$: if ($signerAddress) {
		checkBalance();
	}

	const checkBalance = () => {
		if (amountToLock) {
			const bigNumValue = BigInt(parseEther(amountToLock.toString()).toString());
			assets = bigNumValue;
			insufficientFunds = $balancesStore.sFlrBalance < assets;
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
			cysFlrAddress: $cysFlrAddress,
			sFlrAddress: $sFlrAddress,
			erc1155Address: $erc1155Address,
			assets: assets
		});
	};

	$: if (assets || amountToLock) {
		balancesStore.refreshSwapQuote(
			$wagmiConfig,
			$cysFlrAddress,
			$cusdxAddress,
			assets,
			$quoterAddress
		);
	}
</script>

<Card size="lg">
	<div class="flex w-full flex-col items-center justify-center gap-10" data-testid="lock-container">
		{#if $signerAddress}
			<div
				class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
			>
				<span>sFLR BALANCE</span>

				<div class="flex flex-row gap-4">
					<span data-testid="your-balance">
						{formatEther($balancesStore.sFlrBalance)}
					</span>
				</div>
			</div>
		{/if}

		<div
			class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
		>
			<div class="flex flex-col gap-0">
				<span>sFLR/USD PRICE</span>
				<a
					href={base + '/docs/why-flare'}
					class="cursor-pointer text-xs font-light hover:underline"
					target="_blank"
					data-testid="price-ratio-link">How does Cyclo use the FTSO?</a
				>
			</div>
			{#if $balancesStore.lockPrice}
				<div in:fade>
					{#key $balancesStore.lockPrice}
						<span
							in:fade={{ duration: 700 }}
							class="flex flex-row items-center gap-2"
							data-testid="price-ratio"
							>{Number(formatEther($balancesStore.lockPrice)).toString()}

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
							</svg></span
						>
					{/key}
				</div>
			{/if}
		</div>

		<div
			class="flex w-full flex-col justify-between text-lg font-semibold text-white sm:flex-row sm:text-xl"
		>
			<span>LOCK AMOUNT</span>
			<div class="flex flex-col">
				<Input
					data-testid="lock-input"
					on:input={(event) => {
						amountToLock = event.detail.value;
						checkBalance();
					}}
					on:setValueToMax={() => {
						assets = $balancesStore.sFlrBalance;
						amountToLock = Number(formatEther($balancesStore.sFlrBalance)).toString();
					}}
					bind:amount={amountToLock}
					maxValue={$balancesStore.sFlrBalance}
					unit={'sFLR'}
				/>
				{#if $signerAddress}
					<p class="my-2 text-left text-xs font-light sm:text-right" data-testid="sflr-balance">
						sFLR Balance: {formatEther($balancesStore.sFlrBalance)}
					</p>
				{:else}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<div
						on:click={() => $web3Modal.open()}
						class="my-2 cursor-pointer text-right text-xs font-light hover:underline"
						data-testid="connect-message"
					>
						Connect a wallet to see sFLR balance
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

				<span>sFLR</span>
			</div>

			<div class="flex w-full">
				<div
					class="flex w-1/4 flex-col items-center justify-center pb-12 pl-6 pr-2 text-center text-white"
				>
					<img src={ftso} alt="ftso" class="w-1/2" />
					{#key $balancesStore.lockPrice}
						{formatEther($balancesStore.lockPrice)}
					{/key}
				</div>
				<img src={mintDia} alt="diagram" class="w-1/2" />
				<div class="w-1/4"></div>
			</div>

			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white sm:text-xl"
			>
				{#key $balancesStore.lockPrice}
					<span data-testid="calculated-cysflr"
						>{!amountToLock ? '0' : formatEther($balancesStore.swapQuotes.cysFlrOutput)}</span
					>
				{/key}
				<span>cysFLR</span>
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

				<span>sFLR</span>
			</div>
			<img src={mintMobileSquiggle} alt="diagram" class="h-12" />
			<div class="flex w-1/4 flex-col items-center justify-center text-center text-white">
				<img src={ftso} alt="ftso" class="" />
				{Number(formatEther($balancesStore.lockPrice.toString()))}
			</div>
			<img src={mintMobile} alt="diagram" class="h-60" />
			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white md:text-2xl"
			>
				{#key $balancesStore.lockPrice}
					<span data-testid="calculated-cysflr-mobile"
						>{!amountToLock ? '0' : formatEther($balancesStore.swapQuotes.cysFlrOutput)}</span
					>
				{/key}
				<span>cysFLR</span>
			</div>
			<div
				class="flex w-full items-center justify-center gap-2 text-center text-lg font-semibold text-white sm:text-xl"
			>
				{#key $balancesStore.lockPrice}
					<span class="text-sm" data-testid="calculated-cysflr-usd-mobile"
						>Current market value ~$ {amountToLock
							? formatUnits($balancesStore.swapQuotes.cusdxOutput, 6)
							: '0'}
					</span>
				{/key}
			</div>
		</div>

		{#if $signerAddress}
			<Button
				disabled={insufficientFunds || !assets || !amountToLock}
				customClass="sm:text-xl text-lg w-full bg-white text-primary"
				data-testid="lock-button"
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
			Before you lock your sFLR, make sure you understand the following:
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
				Cyclo relies on oracles to determine the FLR/USD price and the sFLR/FLR exchange rate. These
				are maintained by Flare Networks and Sceptre respectively.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				You must keep your receipt tokens safe to unlock your sFLR.
			</li>
			<li class="relative pl-2">
				<span class="absolute -left-4">•</span>
				The value of cysFLR is determined solely by market forces.
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
				data-testid="disclaimer-acknowledge-button"
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
</style>

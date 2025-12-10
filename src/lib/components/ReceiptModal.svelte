<script lang="ts">
	import balancesStore from '$lib/balancesStore';
	import type { CyToken, Receipt } from '$lib/types';
	import { fade } from 'svelte/transition';
	import transactionStore from '$lib/transactionStore';
	import { signerAddress, wagmiConfig } from 'svelte-wagmi';
	import { readContract } from '@wagmi/core';
	import { formatEther } from 'ethers';
	import { formatUnits, parseUnits } from 'viem';
	import burnDia from '$lib/images/burn-dia.svg';
	import mobileBurnLine from '$lib/images/mobile-burn-line.svg';
	import mobileBurnDia from '$lib/images/mobile-burn.svg';
	import Input from './Input.svelte';
	import Button from './Button.svelte';
	import { selectedCyToken } from '$lib/stores';
	import { erc20PriceOracleReceiptVaultAbi } from '$lib/contracts/erc20PriceOracleReceiptVaultAbi';

	export let receipt: Receipt;
	export let token: CyToken;
	enum ButtonStatus {
		INSUFFICIENT_RECEIPTS = 'INSUFFICIENT RECEIPTS',
		INSUFFICIENT_TOKEN = `INSUFFICIENT cyTOKEN`,
		READY = 'UNLOCK'
	}
	let buttonStatus: ButtonStatus = ButtonStatus.READY;

	let erc1155balance = BigInt(receipt.balance);
	let readableAmountToRedeem: string = '';
	let amountToRedeem = BigInt(0);
	let sFlrToReceive = BigInt(0);
	let isCalculating = false;
	let shouldCallContract = false;
	let debounceTimer: ReturnType<typeof setTimeout>;

	const readableBalance = Number(formatUnits(receipt.balance, token.decimals));
	const tokenId = receipt.tokenId;

	const checkBalance = async () => {
		if (isCalculating || !receipt.tokenId) {
			if (!readableAmountToRedeem) {
				amountToRedeem = BigInt(0);
			}
			return;
		}

		if (!readableAmountToRedeem || readableAmountToRedeem === '') {
			amountToRedeem = BigInt(0);
			sFlrToReceive = BigInt(0);
			return;
		}

		try {
			isCalculating = true;
			const _sFlrToReceive = await readContract($wagmiConfig, {
				abi: erc20PriceOracleReceiptVaultAbi,
				functionName: 'previewRedeem',
				address: $selectedCyToken.address,
				args: [amountToRedeem, receipt.tokenId]
			});
			sFlrToReceive = _sFlrToReceive as bigint;
		} catch {
			sFlrToReceive = BigInt(0);
			amountToRedeem = BigInt(0);
		} finally {
			isCalculating = false;
		}
	};

	$: maxRedeemable =
		($balancesStore.balances[receipt.token || 'cysFLR']?.signerBalance ?? 0n) <
		(erc1155balance ?? 0n)
			? $balancesStore.balances[receipt.token || 'cysFLR']?.signerBalance ?? 0n
			: erc1155balance ?? 0n;

	$: if (shouldCallContract && amountToRedeem !== undefined && !isCalculating) {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			checkBalance();
			shouldCallContract = false;
		}, 300);
	}

	$: insufficientReceipts = erc1155balance < amountToRedeem;
	$: insufficientcysFlr =
		($balancesStore.balances[receipt.token || 'cysFLR']?.signerBalance ?? 0n) < amountToRedeem;

	$: buttonStatus = !readableAmountToRedeem
		? ButtonStatus.READY
		: insufficientReceipts
			? ButtonStatus.INSUFFICIENT_RECEIPTS
			: insufficientcysFlr
				? ButtonStatus.INSUFFICIENT_TOKEN
				: ButtonStatus.READY;
</script>

<div
	class="flex h-fit w-full flex-col items-center justify-center gap-4 overflow-y-scroll p-0 text-sm sm:gap-6 sm:p-6 sm:text-base"
	data-testId="receipt-modal"
>
	<div class="flex w-full flex-col justify-between font-semibold text-white sm:flex-row">
		<span>TOTAL {token.underlyingSymbol} LOCKED</span>
		<div class="flex flex-row gap-4">
			{#key readableBalance}{#if readableBalance}
					<span in:fade={{ duration: 700 }}
						>{formatUnits(receipt.totalsFlr ?? 0n, token.decimals)}</span
					>
				{/if}{/key}
		</div>
	</div>
	<div class="flex w-full flex-col justify-between font-semibold text-white sm:flex-row">
		<span>TOTAL {receipt.token} MINTED</span>
		<div class="flex flex-row gap-4">
			{#key readableBalance}{#if readableBalance}
					<span in:fade={{ duration: 700 }} data-testid="balance">{Number(readableBalance)}</span>
				{/if}{/key}
		</div>
	</div>

	<div class="flex w-full flex-col justify-between font-semibold text-white sm:flex-row">
		<span>{receipt.token} PER LOCKED {token.underlyingSymbol}</span>
		<div class="flex flex-row gap-4">
			<span data-testid="lock-up-price">{Number(formatEther(tokenId))}</span>
		</div>
	</div>

	<div
		class="flex w-full flex-col items-start justify-between font-semibold text-white sm:flex-row"
	>
		<span>REDEEM AMOUNT</span>
		<div class="flex flex-col">
			<Input
				unit={receipt.token}
				bind:amount={readableAmountToRedeem}
				on:input={(event) => {
					readableAmountToRedeem = event.detail.value;
					if (
						!readableAmountToRedeem ||
						readableAmountToRedeem === '' ||
						readableAmountToRedeem === '0'
					) {
						amountToRedeem = BigInt(0);
						sFlrToReceive = BigInt(0);
						shouldCallContract = false;
						return;
					}
					try {
						amountToRedeem = parseUnits(readableAmountToRedeem.toString(), token.decimals);
						shouldCallContract = true;
					} catch {
						amountToRedeem = BigInt(0);
						shouldCallContract = false;
					}
				}}
				dataTestId="redeem-input"
				placeholder="0.0"
				maxButton
				on:setValueToMax={() => {
					amountToRedeem = maxRedeemable;
					readableAmountToRedeem = Number(formatUnits(maxRedeemable, token.decimals)).toString();
					shouldCallContract = true;
				}}
			/>
			<p class="my-2 text-left text-xs font-light sm:text-right" data-testid="sflr-balance">
				{receipt.token} Balance: {Number(
					formatUnits($balancesStore.balances[token.name]?.signerBalance || 0n, token.decimals)
				)}
			</p>
		</div>
	</div>
	<!-- Burn diagram for desktop -->
	<div class="hidden w-full flex-col items-center justify-center font-semibold text-white sm:flex">
		<div class="flex w-full flex-row justify-center gap-12 text-right">
			<span class="w-1/2 text-center"
				>{!readableAmountToRedeem ? 0 : readableAmountToRedeem} RECEIPTS</span
			>
			<span class="w-1/2 text-center"
				>{!readableAmountToRedeem ? 0 : readableAmountToRedeem} {receipt.token}</span
			>
		</div>
		<img src={burnDia} alt="diagram" class="w-1/2 py-4" />

		<div class="flex flex-row items-center gap-2 overflow-ellipsis">
			<span class="flex overflow-ellipsis" data-testid="flr-to-receive">
				{formatUnits(sFlrToReceive, token.decimals)}
				{token.underlyingSymbol}
			</span>
		</div>
	</div>
	<!-- Burn diagram for mobile -->
	<div
		class="flex w-full flex-col items-center justify-center text-sm font-semibold text-white sm:hidden sm:text-xl"
	>
		<div class="flex w-full flex-col items-center justify-center gap-1 text-right">
			<span class="w-full text-center"
				>{readableAmountToRedeem === null ? 0 : readableAmountToRedeem} {receipt.token}</span
			>
			<img src={mobileBurnLine} alt="diagram" class="h-6" />
			<span class="w-full text-center"
				>{readableAmountToRedeem === null ? 0 : readableAmountToRedeem} RECEIPTS</span
			>
			<img src={mobileBurnDia} alt="diagram" class="h-32" />
			<div class="flex flex-row items-center gap-2 overflow-ellipsis">
				<span class="flex overflow-ellipsis" data-testid="flr-to-receive-mobile">
					{formatUnits(sFlrToReceive, token.decimals)}
					{token.underlyingSymbol}
				</span>
			</div>
		</div>
	</div>

	<Button
		dataTestId="unlock-button"
		customClass="w-full bg-white text-primary"
		disabled={buttonStatus !== ButtonStatus.READY || amountToRedeem === BigInt(0)}
		on:click={() =>
			transactionStore.handleUnlockTransaction({
				signerAddress: $signerAddress,
				config: $wagmiConfig,
				selectedToken: token,
				erc1155Address: $selectedCyToken.receiptAddress,
				tokenId: receipt.tokenId,
				assets: amountToRedeem
			})}
	>
		{buttonStatus}
	</Button>
</div>
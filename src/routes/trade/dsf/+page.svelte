<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { tokensForNetwork } from '$lib/constants';
	import {
		allTokens,
		selectedCyToken as storeSelectedCyToken,
		supportedNetworks,
		setActiveNetwork
	} from '$lib/stores';
	import { switchNetwork } from '@wagmi/core';
	import { wagmiConfig } from 'svelte-wagmi';
	import type { CyToken, Token } from '$lib/types';
	import TradeAmountInput from '$lib/components/TradeAmountInput.svelte';
	import Button from '$lib/components/Button.svelte';
	import TradePrice from '$lib/components/TradePrice.svelte';
	import type { DataFetcher } from 'sushi';
	import { useDataFetcher } from '$lib/dataFetcher';
	import transactionStore from '$lib/transactionStore';
	import { Toggle } from 'flowbite-svelte';
	import VaultIdInput from '$lib/components/VaultIdInput.svelte';
	import type { Hex } from 'viem';
	import {
		validateSelectedAmount,
		validateBaseline,
		validateOverrideDepositAmount
	} from '$lib/trade/validateDeploymentArgs';
	import InfoTooltip from '$lib/components/InfoTooltip.svelte';

	// Network and token setup
	let selectedNetworkForRotateToken = supportedNetworks[0];
	let networkTokens: Token[] = [];
	let lastSyncedNetworkKey: string | undefined;
	let lastSwitchedChainId: number | undefined;
	// DSF-specific token selections
	let amountToken: Token | undefined;
	let rotateToken: CyToken | undefined;

	// Resolve network for the rotateToken
	$: selectedNetworkForRotateToken = rotateToken
		? supportedNetworks.find((network) => network.chain.id === rotateToken!.chainId) ||
		  supportedNetworks[0]
		: supportedNetworks[0];

	// Keep the app's active network aligned with the rotateToken's network
	$: if (selectedNetworkForRotateToken?.key && selectedNetworkForRotateToken.key !== lastSyncedNetworkKey) {
		setActiveNetwork(selectedNetworkForRotateToken.key);
		lastSyncedNetworkKey = selectedNetworkForRotateToken.key;

		// Prompt the wallet to switch chains to match the selected token's network
		const config = $wagmiConfig;
		const targetChainId = selectedNetworkForRotateToken.chain.id;
		if (config && targetChainId !== lastSwitchedChainId) {
			switchNetwork(config, { chainId: targetChainId }).catch((error) =>
				console.warn(`Failed to switch wallet network to ${selectedNetworkForRotateToken.key}:`, error)
			);
			lastSwitchedChainId = targetChainId;
		}
	}

	$: networkTokens = tokensForNetwork(selectedNetworkForRotateToken.key);

	// Initialize amountToken from networkTokens
	$: if (!amountToken && networkTokens.length > 0) {
		amountToken = networkTokens[0];
	}

	// Initialize rotateToken from store
	$: if (!rotateToken && $allTokens.length > 0) {
		const storeToken = $storeSelectedCyToken;
		const storeTokenValid = $allTokens.some((t) => t.name === storeToken.name);
		rotateToken = storeTokenValid ? storeToken : $allTokens[0];
	}

	// Persist rotateToken selection back to the store
	$: if (rotateToken) {
		storeSelectedCyToken.set(rotateToken);
	}

	// DSF deployment parameters
	let overrideDepositAmount: bigint = 0n;
	let rotateDepositAmount: bigint = 0n;
	let amountTokenInputVaultId: Hex | undefined;
	let rotateTokenInputVaultId: Hex | undefined;
	let amountTokenOutputVaultId: Hex | undefined;
	let rotateTokenOutputVaultId: Hex | undefined;
	let maxTradeAmount: bigint;
	let minTradeAmount: bigint;
	let initialPrice: string;
	let nextTradeMultiplier: string = '1.01';
	let costBasisMultiplier: string = '1';
	let timePerEpoch: string = '3600';

	// errors
	let amountTokenInputVaultIdError: boolean = false;
	let rotateTokenInputVaultIdError: boolean = false;
	let amountTokenOutputVaultIdError: boolean = false;
	let rotateTokenOutputVaultIdError: boolean = false;
	let overrideDepositAmountError: boolean = false;
	let rotateDepositAmountError: boolean = false;
	let maxTradeAmountError: boolean = false;
	let minTradeAmountError: boolean = false;
	let initialPriceError: boolean = false;
	let nextTradeMultiplierError: boolean = false;
	let costBasisMultiplierError: boolean = false;
	let timePerEpochError: boolean = false;

	$: disableDeploy =
		!amountToken ||
		!rotateToken ||
		!maxTradeAmount ||
		!minTradeAmount ||
		!initialPrice ||
		(chooseOverrideDepositAmount && overrideDepositAmount == undefined) ||
		amountTokenInputVaultIdError ||
		rotateTokenInputVaultIdError ||
		amountTokenOutputVaultIdError ||
		rotateTokenOutputVaultIdError ||
		maxTradeAmountError ||
		minTradeAmountError ||
		initialPriceError ||
		(chooseOverrideDepositAmount && overrideDepositAmountError);

	// advanced options
	let showAdvancedOptions: boolean = false;
	let chooseOverrideDepositAmount: boolean = false;
	let amountTokenFastExit: boolean = false;
	let rotateTokenFastExit: boolean = false;

	const dataFetcher: DataFetcher = useDataFetcher();

	const handleDeploy = () => {
		if (!amountToken || !rotateToken) return;

		// Ensure the active network matches the rotateToken's network
		setActiveNetwork(selectedNetworkForRotateToken.key);

		transactionStore.handleDeployDsf(
			{
				amountToken,
				rotateToken,
				isAmountTokenFastExit: amountTokenFastExit,
				isRotateTokenFastExit: rotateTokenFastExit,
				initialPrice,
				maxTradeAmount,
				minTradeAmount,
				nextTradeMultiplier,
				costBasisMultiplier,
				timePerEpoch,
				amountTokenInputVaultId,
				rotateTokenInputVaultId,
				amountTokenOutputVaultId,
				rotateTokenOutputVaultId,
				amountTokenDepositAmount: overrideDepositAmount,
				rotateTokenDepositAmount: rotateDepositAmount,
				selectedNetworkKey: selectedNetworkForRotateToken.key
			},
			dataFetcher
		);
	};
</script>

<div class="grid w-full grid-cols-1 items-start gap-6">
	<h1 class="text-2xl text-white">Deploy a DSF strategy</h1>
	<p class="text-sm text-gray-200">
		A market-making order that offers two-sided auction-based spreads that narrow over time, with a defensive feature that quickly exits positions by counter-trading when market trends emerge.
	</p>
	<p class="text-sm text-gray-200">
		This strategy is powered by Raindex. Once you've deployed you can manage your order and withdraw
		the funds on <a target="_blank" class="underline" href="https://v2.raindex.finance"
			>the Raindex platform</a
		>.
	</p>
	<div class="flex flex-col gap-2">
        <!-- Amount Token -->
		<span class="text-sm text-gray-200" 
            >Amount Token</span
        >
        {#if networkTokens.length > 0}
            <Select
                options={networkTokens}
                bind:selected={amountToken}
                getOptionLabel={(token) => token?.name || ''}
                dataTestId="token-select"
            />
        {/if}

		<!-- Rotate Token -->
		<span class="text-sm text-gray-200"
			>Rotate Token</span
		>
		<!-- Rotate Token -->
		{#if $allTokens.length > 0}
			<Select
				options={$allTokens}
				bind:selected={rotateToken}
				getOptionLabel={(token) => token?.name || ''}
				dataTestId="cy-token-select"
			/>
		{/if}
	</div>
    <div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-200">Amount token fast exit</span>
			<Toggle bind:checked={amountTokenFastExit} size="small" />
			<span class="text-sm text-gray-400">{amountTokenFastExit ? 'On' : 'Off'}</span>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-200">Rotate token fast exit</span>
			<Toggle bind:checked={rotateTokenFastExit} size="small" />
			<span class="text-sm text-gray-400">{rotateTokenFastExit ? 'On' : 'Off'}</span>
		</div>
    </div>

    <!-- Initial Price -->
	<div class="flex flex-col gap-2" data-testid="baseline-container">
		{#if amountToken && rotateToken}
			<div class="text-sm text-gray-200">
				Initial Price at ({`${amountToken.symbol} per ${rotateToken.symbol}`})
				<InfoTooltip
					>The initial price of the {amountToken.symbol} in the {rotateToken.symbol} market.
				</InfoTooltip>
			</div>

			<Input
				type="number"
				unit={amountToken.symbol}
				bind:amount={initialPrice}
				dataTestId="initial-price-input"
				validate={validateBaseline}
				bind:isError={initialPriceError}
			/>
			<TradePrice
				inputToken={amountToken}
				outputToken={rotateToken}
				dataTestId="trade-price"
			/>
		{/if}
	</div>

	<!-- Maximum Amount -->
	<div class="flex flex-col gap-2" data-testid="amount-container">
		<span class="text-sm text-gray-200"
			>Maximum Trade Amount 
			<InfoTooltip
				>The maximum amount of {amountToken?.symbol} that will be offered in a single auction.
			</InfoTooltip></span
		>
		{#if amountToken}
			<TradeAmountInput
				amountToken={amountToken}
				bind:amount={maxTradeAmount}
				dataTestId="amount-input"
				validate={validateSelectedAmount}
				bind:isError={maxTradeAmountError}
			/>
		{/if}
	</div>

    <!-- Minimum Amount -->
	<div class="flex flex-col gap-2" data-testid="amount-container">
		<span class="text-sm text-gray-200"
			>Minimum Trade Amount 
			<InfoTooltip
				>The minimum amount of {amountToken?.symbol} that will be offered in a single auction.
			</InfoTooltip></span
		>
		{#if amountToken}
			<TradeAmountInput
				amountToken={amountToken}
				bind:amount={minTradeAmount}
				dataTestId="amount-input"
				validate={validateSelectedAmount}
				bind:isError={minTradeAmountError}
			/>
		{/if}
	</div>
	
	<!-- advanced options -->
	<div class="flex flex-col gap-6">
		<div class="flex items-center gap-2">
			<button
				class="text-xs text-gray-200"
				on:click={() => (showAdvancedOptions = !showAdvancedOptions)}
			>
				{showAdvancedOptions ? 'Hide advanced options' : 'Show advanced options'}
			</button>
		</div>

		{#if showAdvancedOptions}
			<div class="flex flex-col gap-6">
				<!-- Next Trade Multiplier -->
				<div class="flex flex-col gap-2">
					<span class="text-sm text-gray-200">
						Next Trade Multiplier
						<InfoTooltip
							>This is the most the order will move the price in a single trade. Larger numbers will capture larger price jumps but trade less often, smaller numbers will trade more often but be less defensive against large price jumps in the market.
						</InfoTooltip>
					</span>
					<Input
						type="number"
						bind:amount={nextTradeMultiplier}
						dataTestId="next-trade-multiplier-input"
						bind:isError={nextTradeMultiplierError}
					/>
				</div>

				<!-- Cost Basis Multiplier -->
				<div class="flex flex-col gap-2">
					<span class="text-sm text-gray-200">
						Cost Basis Multiplier
						<InfoTooltip
							>The minimum spread applied to the breakeven in addition to the auction. This is applied in both directions so 1.01x would be a 2% total spread.
						</InfoTooltip>
					</span>
					<Input
						type="number"
						bind:amount={costBasisMultiplier}
						dataTestId="cost-basis-multiplier-input"
						bind:isError={costBasisMultiplierError}
					/>
				</div>

				<!-- Time Per Epoch -->
				<div class="flex flex-col gap-2">
					<span class="text-sm text-gray-200">
						Time Per Epoch
						<InfoTooltip
							>The amount of time (in seconds) between halvings of the price and the amount offered during each auction, relative to their baselines.
						</InfoTooltip>
					</span>
					<Input
						type="number"
						bind:amount={timePerEpoch}
						dataTestId="time-per-epoch-input"
						bind:isError={timePerEpochError}
					/>
				</div>


				<!-- deposit amount -->
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<span class="text-md text-gray-200">Custom deposit amount</span>
						<Toggle bind:checked={chooseOverrideDepositAmount} size="small" />
					</div>
					{#if chooseOverrideDepositAmount}
						{#if amountToken}
							<TradeAmountInput
								amountToken={amountToken}
								bind:amount={overrideDepositAmount}
								dataTestId="deposit-amount-input"
								validate={validateOverrideDepositAmount}
								bind:isError={overrideDepositAmountError}
							/>
						{/if}
						{#if rotateToken}
							<TradeAmountInput
								amountToken={rotateToken}
								bind:amount={rotateDepositAmount}
								dataTestId="rotate-deposit-amount-input"
								validate={validateOverrideDepositAmount}
								bind:isError={rotateDepositAmountError}
							/>
						{/if}
					{/if}
				</div>

                
				<!-- vault ids -->
				<div class="flex flex-col gap-2">
					<span class="text-md text-gray-200">Vault ids</span>
					<div class="flex flex-col gap-2">
						<span class="text-sm text-gray-200">{amountToken?.symbol} Input Vault ID</span>
						<VaultIdInput bind:vaultId={amountTokenInputVaultId} bind:isError={amountTokenInputVaultIdError} />
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-sm text-gray-200">{rotateToken?.symbol} Input Vault ID</span>
						<VaultIdInput bind:vaultId={rotateTokenInputVaultId} bind:isError={rotateTokenInputVaultIdError} />
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-sm text-gray-200">{amountToken?.symbol} Output Vault ID</span>
						<VaultIdInput bind:vaultId={amountTokenOutputVaultId} bind:isError={amountTokenOutputVaultIdError} />
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-sm text-gray-200">{rotateToken?.symbol} Output Vault ID</span>
						<VaultIdInput bind:vaultId={rotateTokenOutputVaultId} bind:isError={rotateTokenOutputVaultIdError} />
					</div>
				</div>
			</div>
		{/if}
	</div>

	<Button on:click={handleDeploy} dataTestId="deploy-button" disabled={disableDeploy}>Deploy</Button
	>
</div>

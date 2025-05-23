<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { tokens } from '$lib/constants';
	import { tokens as cyTokens } from '$lib/stores';
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
		validatePeriod,
		validateBaseline,
		validateOverrideDepositAmount
	} from '$lib/trade/validateDeploymentArgs';
	import InfoTooltip from '$lib/components/InfoTooltip.svelte';

	// selected values
	let selectedCyToken: CyToken = cyTokens[0];
	let selectedToken: Token = tokens[0];
	let selectedBuyOrSell: 'Buy' | 'Sell' = 'Buy';
	let selectedPeriodUnit: 'Days' | 'Hours' | 'Minutes' = 'Days';
	let selectedAmountToken: Token;
	let selectedAmount: bigint;
	let selectedPeriod: string;
	let selectedBaseline: string;
	let overrideDepositAmount: bigint;
	let inputVaultId: Hex | undefined;
	let outputVaultId: Hex | undefined;
	$: selectedAmountToken = selectedBuyOrSell == 'Buy' ? selectedToken : selectedCyToken;
	$: depositAmount = chooseOverrideDepositAmount ? overrideDepositAmount : selectedAmount;

	// errors
	let selectedAmountError: boolean = false;
	let selectedPeriodError: boolean = false;
	let selectedBaselineError: boolean = false;
	let inputVaultIdError: boolean = false;
	let outputVaultIdError: boolean = false;
	let overrideDepositAmountError: boolean = false;

	$: disableDeploy =
		!selectedAmount ||
		!selectedPeriod ||
		!selectedBaseline ||
		(chooseOverrideDepositAmount && overrideDepositAmount == undefined) ||
		inputVaultIdError ||
		outputVaultIdError ||
		selectedAmountError ||
		selectedPeriodError ||
		selectedBaselineError ||
		(chooseOverrideDepositAmount && overrideDepositAmountError);

	// advanced options
	let showAdvancedOptions: boolean = false;
	let chooseOverrideDepositAmount: boolean = false;

	const dataFetcher: DataFetcher = useDataFetcher();

	const handleDeploy = () => {
		transactionStore.handleDeployDca(
			{
				selectedCyToken,
				selectedToken,
				selectedBuyOrSell,
				selectedPeriodUnit,
				selectedAmountToken,
				selectedAmount,
				selectedPeriod,
				selectedBaseline,
				depositAmount,
				inputVaultId,
				outputVaultId
			},
			dataFetcher
		);
	};
</script>

<div class="grid w-full grid-cols-1 items-start gap-6">
	<h1 class="text-2xl text-white">Deploy a DCA strategy</h1>
	<p class="text-sm text-gray-200">
		This is a streaming DCA strategy. You can deploy it to spread out buys or sells of cyTokens over
		time. Very useful when the slippage is too high for a single transaction!
	</p>
	<p class="text-sm text-gray-200">
		This strategy is powered by Raindex. Once you've deployed you can manage your order and withdraw
		the funds on <a target="_blank" class="underline" href="https://v2.raindex.finance"
			>the Raindex platform</a
		>.
	</p>
	<div class="flex flex-col gap-2">
		<!-- whether to buy or sell -->
		<Select
			options={['Buy', 'Sell']}
			bind:selected={selectedBuyOrSell}
			getOptionLabel={(option) => option}
			dataTestId="buy-sell-select"
		/>

		<!-- token to buy or sell -->
		<Select
			options={cyTokens}
			bind:selected={selectedCyToken}
			getOptionLabel={(token) => token.name}
			dataTestId="cy-token-select"
		/>

		<!-- token to spend or receive -->
		<span class="text-sm text-gray-200" data-testid="with-for-label"
			>{selectedBuyOrSell == 'Buy' ? 'with' : 'for'}</span
		>
		<Select
			options={tokens}
			bind:selected={selectedToken}
			getOptionLabel={(token) => token.name}
			dataTestId="token-select"
		/>
	</div>

	<!-- amount to spend or receive -->
	<div class="flex flex-col gap-2" data-testid="amount-container">
		<span class="text-sm text-gray-200"
			>Amount to {selectedBuyOrSell == 'Buy' ? 'spend' : 'sell'}
			<InfoTooltip
				>The number of tokens you will {selectedBuyOrSell == 'Buy' ? 'spend' : 'sell'} every period of
				time defined below. This creates a streaming budget over time.
			</InfoTooltip></span
		>
		<TradeAmountInput
			amountToken={selectedAmountToken}
			bind:amount={selectedAmount}
			dataTestId="amount-input"
			validate={validateSelectedAmount}
			bind:isError={selectedAmountError}
		/>
	</div>

	<!-- period over which to spend or receive -->
	<div class="flex flex-col gap-2" data-testid="period-container">
		<span class="text-sm text-gray-200"
			>Every
			<InfoTooltip
				>The strategy will attempt to {selectedBuyOrSell == 'Buy' ? 'spend' : 'sell'}
				the number of tokens you specified above every period of time defined here.</InfoTooltip
			></span
		>
		<div class="flex items-start gap-2">
			<Input
				type="number"
				bind:amount={selectedPeriod}
				dataTestId="period-input"
				validate={validatePeriod}
				bind:isError={selectedPeriodError}
			/>
			<Select
				options={['Hours', 'Days', 'Minutes']}
				bind:selected={selectedPeriodUnit}
				getOptionLabel={(option) => option}
				dataTestId="period-unit-select"
			/>
		</div>
	</div>

	<!-- lowest price to spend or receive -->
	<div class="flex flex-col gap-2" data-testid="baseline-container">
		<div class="text-sm text-gray-200">
			{selectedBuyOrSell == 'Buy' ? 'Highest price to buy' : 'Lowest price to sell'} at ({`${selectedToken.symbol} per ${selectedCyToken.symbol}`})
			<InfoTooltip
				>The {selectedBuyOrSell == 'Buy' ? 'highest' : 'lowest'} price at which the strategy will {selectedBuyOrSell ==
				'Buy'
					? 'buy'
					: 'sell'}. If the market price won't allow it, the strategy will not buy or sell, but note
				the budget set above is still accruing, meaning the strategy will attempt to "catch up" when
				the market comes back within range.
			</InfoTooltip>
		</div>

		<Input
			type="number"
			unit={selectedToken.symbol}
			bind:amount={selectedBaseline}
			dataTestId="baseline-input"
			validate={validateBaseline}
			bind:isError={selectedBaselineError}
		/>
		<TradePrice inputToken={selectedToken} outputToken={selectedCyToken} dataTestId="trade-price" />
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
				<!-- deposit amount -->
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-2">
						<span class="text-md text-gray-200">Custom deposit amount</span>
						<Toggle bind:checked={chooseOverrideDepositAmount} size="small" />
					</div>
					{#if chooseOverrideDepositAmount}
						<TradeAmountInput
							amountToken={selectedAmountToken}
							bind:amount={overrideDepositAmount}
							dataTestId="deposit-amount-input"
							validate={validateOverrideDepositAmount}
							bind:isError={overrideDepositAmountError}
						/>
					{/if}
				</div>
				<!-- vault ids -->
				<div class="flex flex-col gap-2">
					<span class="text-md text-gray-200">Vault ids</span>
					<div class="flex flex-col gap-2">
						<span class="text-sm text-gray-200">Input vault id</span>
						<VaultIdInput bind:vaultId={inputVaultId} bind:isError={inputVaultIdError} />
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-sm text-gray-200">Output vault id</span>
						<VaultIdInput bind:vaultId={outputVaultId} bind:isError={outputVaultIdError} />
					</div>
				</div>
			</div>
		{/if}
	</div>

	<Button on:click={handleDeploy} dataTestId="deploy-button" disabled={disableDeploy}>Deploy</Button
	>
</div>

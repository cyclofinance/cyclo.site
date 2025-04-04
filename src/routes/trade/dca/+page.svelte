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
	let selectedCyToken: CyToken = cyTokens[0];
	let selectedToken: Token = tokens[0];
	let selectedBuyOrSell: 'Buy' | 'Sell' = 'Buy';
	let selectedPeriodUnit: 'Days' | 'Hours' | 'Minutes' = 'Days';
	let selectedAmountToken: Token;
	let selectedAmount: bigint;
	let selectedPeriod: string;
	let selectedBaseline: string;

	$: selectedAmountToken = selectedBuyOrSell == 'Buy' ? selectedToken : selectedCyToken;

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
				selectedBaseline
			},
			dataFetcher
		);
	};
</script>

<div class="grid w-full grid-cols-1 items-start gap-6">
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
			>Amount to {selectedBuyOrSell == 'Buy' ? 'spend' : 'sell'}</span
		>
		<TradeAmountInput
			amountToken={selectedAmountToken}
			bind:amount={selectedAmount}
			dataTestId="amount-input"
		/>
	</div>

	<!-- period over which to spend or receive -->
	<div class="flex flex-col gap-2" data-testid="period-container">
		<span class="text-sm text-gray-200">Over period</span>
		<div class="flex items-center gap-2">
			<Input type="number" bind:amount={selectedPeriod} dataTestId="period-input" />
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
		</div>

		<Input
			type="number"
			unit={selectedToken.symbol}
			bind:amount={selectedBaseline}
			dataTestId="baseline-input"
		/>
		<TradePrice inputToken={selectedToken} outputToken={selectedCyToken} dataTestId="trade-price" />
	</div>
	<Button on:click={handleDeploy} dataTestId="deploy-button">Deploy</Button>
</div>

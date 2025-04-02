<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { tokens } from '$lib/constants';
	import { tokens as cyTokens } from '$lib/stores';
	import type { CyToken, Token } from '$lib/types';
	import TradeAmountInput from '$lib/components/TradeAmountInput.svelte';
	import Button from '$lib/components/Button.svelte';
	import { handleDeployDca } from '$lib/trade/handleDeployDca';
	import TradePrice from '$lib/components/TradePrice.svelte';

	let selectedCyToken: CyToken = cyTokens[0];
	let selectedToken: Token = tokens[0];
	let selectedBuyOrSell: 'Buy' | 'Sell' = 'Buy';
	let selectedPeriodUnit: 'Days' | 'Hours' | 'Minutes' = 'Days';
	let selectedAmountToken: Token;
	let selectedAmount: bigint;
	let selectedPeriod: string;
	let selectedBaseline: string;

	$: selectedAmountToken = selectedBuyOrSell == 'Buy' ? selectedToken : selectedCyToken;

	const handleDeploy = () => {
		handleDeployDca({
			selectedCyToken,
			selectedToken,
			selectedBuyOrSell,
			selectedPeriodUnit,
			selectedAmountToken,
			selectedAmount,
			selectedPeriod,
			selectedBaseline
		});
	};
</script>

<div class="grid w-full grid-cols-1 items-start gap-6">
	<div class="flex flex-col gap-2">
		<!-- whether to buy or sell -->
		<Select
			options={['Buy', 'Sell']}
			bind:selected={selectedBuyOrSell}
			getOptionLabel={(option) => option}
		/>

		<!-- token to buy or sell -->
		<Select
			options={cyTokens}
			bind:selected={selectedCyToken}
			getOptionLabel={(token) => token.name}
		/>

		<!-- token to spend or receive -->
		<span class="text-sm text-gray-200">{selectedBuyOrSell == 'Buy' ? 'with' : 'for'} </span>
		<Select options={tokens} bind:selected={selectedToken} getOptionLabel={(token) => token.name} />
	</div>

	<!-- amount to spend or receive -->
	<div class="flex flex-col gap-2">
		<span class="text-sm text-gray-200"
			>Amount to {selectedBuyOrSell == 'Buy' ? 'spend' : 'sell'}</span
		>
		<TradeAmountInput amountToken={selectedAmountToken} bind:amount={selectedAmount} />
	</div>

	<!-- period over which to spend or receive -->
	<div class="flex flex-col gap-2">
		<span class="text-sm text-gray-200">Over period</span>
		<div class="flex items-center gap-2">
			<Input type="number" bind:amount={selectedPeriod} />
			<Select
				options={['Hours', 'Days', 'Minutes']}
				bind:selected={selectedPeriodUnit}
				getOptionLabel={(option) => option}
			/>
		</div>
	</div>

	<!-- lowest price to spend or receive -->
	<div class="flex flex-col gap-2">
		<div class="text-sm text-gray-200">
			{selectedBuyOrSell == 'Buy' ? 'Highest price to buy' : 'Lowest price to sell'} at ({`${selectedToken.symbol} per ${selectedCyToken.symbol}`})
		</div>

		<Input type="number" unit={selectedToken.symbol} bind:amount={selectedBaseline} />
		<TradePrice inputToken={selectedToken} outputToken={selectedCyToken} />
	</div>
	<Button on:click={handleDeploy}>Deploy</Button>
</div>

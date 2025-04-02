import type { CyToken } from '$lib/types';
import type { Token } from '$lib/types';
import dcaStrategy from '$lib/trade/auction-dca-old.rain?raw';
import { formatUnits, getAddress, type Hex } from 'viem';
import { DotrainOrderGui } from '@rainlanguage/orderbook/js_api';
import { getAndStartDataFetcher, getPrice, getRoute } from './prices';
import { Token as SushiToken } from 'sushi/currency';
import { flare } from '@wagmi/core/chains';
import { get } from 'svelte/store';
import { signerAddress, wagmiConfig } from 'svelte-wagmi';
import { sendTransaction } from '@wagmi/core';

const getPeriodInSeconds = (period: string, periodUnit: 'Days' | 'Hours' | 'Minutes'): number => {
	switch (periodUnit) {
		case 'Days':
			return Number(period) * 86400;
		case 'Hours':
			return Number(period) * 3600;
		case 'Minutes':
			return Number(period) * 60;
	}
};

export const handleDeployDca = async (options: {
	selectedCyToken: CyToken;
	selectedToken: Token;
	selectedBuyOrSell: 'Buy' | 'Sell';
	selectedPeriodUnit: 'Days' | 'Hours' | 'Minutes';
	selectedPeriod: string;
	selectedAmountToken: Token;
	selectedAmount: bigint;
	selectedBaseline: string;
}) => {
	const {
		selectedCyToken,
		selectedToken,
		selectedBuyOrSell,
		selectedPeriodUnit,
		selectedAmountToken,
		selectedAmount,
		selectedPeriod,
		selectedBaseline
	} = options;

	const periodInSeconds = getPeriodInSeconds(selectedPeriod, selectedPeriodUnit);

	const gui = await DotrainOrderGui.chooseDeployment(dcaStrategy, 'flare');

	const inputToken = selectedBuyOrSell === 'Buy' ? selectedCyToken : selectedToken;
	const outputToken = selectedAmountToken;

	console.log('selectedBaseline', selectedBaseline, (1 / +selectedBaseline).toString());
	const finalBaseline =
		selectedBuyOrSell === 'Buy' ? (1 / +selectedBaseline).toString() : selectedBaseline;

	await gui.saveSelectToken('input', inputToken.address);
	await gui.saveSelectToken('output', outputToken.address);

	console.log({ inputToken, outputToken });

	const dataFetcher = await getAndStartDataFetcher();

	const price = await getPrice(outputToken, inputToken, dataFetcher); // for the strategy we want the inverse of the market price

	gui.saveFieldValue('time-per-amount-epoch', {
		value: periodInSeconds.toString(),
		isPreset: false
	});

	gui.saveFieldValue('amount-per-epoch', {
		value: formatUnits(selectedAmount, selectedAmountToken.decimals),
		isPreset: false
	});

	gui.saveFieldValue('max-trade-amount', {
		value: formatUnits(selectedAmount, selectedAmountToken.decimals),
		isPreset: false
	});

	gui.saveFieldValue('min-trade-amount', {
		value: '1',
		isPreset: false
	});

	gui.saveFieldValue('baseline', {
		value: finalBaseline,
		isPreset: false
	});

	gui.saveFieldValue('initial-io', {
		value: price,
		isPreset: false
	});

	gui.saveDeposit('output', formatUnits(selectedAmount, selectedAmountToken.decimals));

	const $signerAddress = get(signerAddress);
	if (!$signerAddress) throw new Error('Signer address not found');
	const transactionArgs = await gui.getDeploymentTransactionArgs($signerAddress);

	const config = get(wagmiConfig);
	if (!config) throw new Error('Wagmi config not found');

	if (transactionArgs.approvals.length > 0) {
		await sendTransaction(config, {
			data: transactionArgs.approvals[0].calldata as Hex,
			to: transactionArgs.approvals[0].token as `0x${string}`
		});
	}

	await sendTransaction(config, {
		data: transactionArgs.deploymentCalldata as Hex,
		to: transactionArgs.orderbookAddress as `0x${string}`
	});

	console.log(gui.getAllFieldValues());
	console.log(gui.getDeposits());
};

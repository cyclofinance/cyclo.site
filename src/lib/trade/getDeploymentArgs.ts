import type { CyToken } from '$lib/types';
import type { Token } from '$lib/types';
import dcaStrategy from '$lib/trade/auction-dca-old.rain?raw';
import { formatUnits } from 'viem';
import { DotrainOrderGui } from '@rainlanguage/orderbook/js_api';
import { getPrice } from './prices';
import { get } from 'svelte/store';
import { signerAddress } from 'svelte-wagmi';
import type { DataFetcher } from 'sushi';
import { getBaseline, getMaxTradeAmount, getPeriodInSeconds } from './derivations';
import { tokens } from '$lib/constants';
import type { Hex } from 'viem';

export type DcaDeploymentArgs = {
	selectedCyToken: CyToken;
	selectedToken: Token;
	selectedBuyOrSell: 'Buy' | 'Sell';
	selectedPeriodUnit: 'Days' | 'Hours' | 'Minutes';
	selectedPeriod: string;
	selectedAmountToken: Token;
	selectedAmount: bigint;
	selectedBaseline: string;
	inputVaultId: Hex | undefined;
	outputVaultId: Hex | undefined;
	depositAmount: bigint;
};

export const getDcaDeploymentArgs = async (
	options: DcaDeploymentArgs,
	dataFetcher: DataFetcher
) => {
	const {
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
	} = options;

	const gui = await DotrainOrderGui.chooseDeployment(dcaStrategy, 'flare');

	const inputToken = selectedBuyOrSell === 'Buy' ? selectedCyToken : selectedToken;
	const outputToken = selectedAmountToken;

	await gui.saveSelectToken('input', inputToken.address);
	await gui.saveSelectToken('output', outputToken.address);

	gui.saveFieldValue('time-per-amount-epoch', {
		value: getPeriodInSeconds(selectedPeriod, selectedPeriodUnit).toString(),
		isPreset: false
	});

	gui.saveFieldValue('amount-per-epoch', {
		value: formatUnits(selectedAmount, selectedAmountToken.decimals),
		isPreset: false
	});

	gui.saveFieldValue('max-trade-amount', {
		value: formatUnits(
			getMaxTradeAmount(selectedAmount, selectedPeriod, selectedPeriodUnit),
			selectedAmountToken.decimals
		),
		isPreset: false
	});

	const outputTokenInUSDC =
		outputToken.address === tokens[0].address
			? '1'
			: await getPrice(tokens[0], outputToken, dataFetcher);

	// The minimum trade amount should be $1 worth of the output token
	gui.saveFieldValue('min-trade-amount', {
		value: outputTokenInUSDC,
		isPreset: false
	});

	gui.saveFieldValue('baseline', {
		value: getBaseline(selectedBuyOrSell, selectedBaseline),
		isPreset: false
	});

	gui.saveFieldValue('initial-io', {
		value: await getPrice(outputToken, inputToken, dataFetcher),
		isPreset: false
	});

	gui.saveDeposit('output', formatUnits(depositAmount, selectedAmountToken.decimals));

	if (inputVaultId) {
		gui.setVaultId(true, 0, inputVaultId);
	}

	if (outputVaultId) {
		gui.setVaultId(false, 0, outputVaultId);
	}

	const $signerAddress = get(signerAddress);
	if (!$signerAddress) throw new Error('Signer address not found');

	const deploymentArgs = await gui.getDeploymentTransactionArgs($signerAddress);

	return { deploymentArgs, outputToken };
};

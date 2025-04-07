import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDcaDeploymentArgs } from './getDeploymentArgs';
import { DotrainOrderGui } from '@rainlanguage/orderbook/js_api';
import { getPrice } from './prices';
import { DataFetcher } from 'sushi';
import { flare } from '@wagmi/core/chains';
import { tokens } from '$lib/constants';
import { getBaseline, getMaxTradeAmount, getPeriodInSeconds } from './derivations';
import { get } from 'svelte/store';

// Mock the DotrainOrderGui
vi.mock('@rainlanguage/orderbook/js_api', () => ({
	DotrainOrderGui: {
		chooseDeployment: vi.fn()
	}
}));

// Mock the prices module
vi.mock('./prices', () => ({
	getPrice: vi.fn()
}));

// Mock the svelte-wagmi module
vi.mock('svelte-wagmi', () => ({
	signerAddress: {
		subscribe: vi.fn()
	}
}));

// Mock the svelte/store module
vi.mock('svelte/store', async () => {
	const actual = await vi.importActual('svelte/store');
	return {
		...actual,
		get: vi.fn().mockReturnValue('0x1234567890123456789012345678901234567890')
	};
});

// Mock the derivations module
vi.mock('./derivations', () => ({
	getBaseline: vi.fn(),
	getMaxTradeAmount: vi.fn(),
	getPeriodInSeconds: vi.fn()
}));

describe('getDcaDeploymentArgs', () => {
	const mockGui = {
		saveSelectToken: vi.fn().mockResolvedValue(undefined),
		saveFieldValue: vi.fn().mockResolvedValue(undefined),
		saveDeposit: vi.fn().mockResolvedValue(undefined),
		getDeploymentTransactionArgs: vi.fn().mockResolvedValue({
			to: '0x1234567890123456789012345678901234567890',
			data: '0xabcdef',
			value: 0n
		})
	};

	const mockOptions = {
		selectedCyToken: {
			address: '0xabc123' as `0x${string}`,
			symbol: 'cyTEST',
			name: 'Cyclo TEST',
			decimals: 18,
			underlyingSymbol: 'TEST',
			underlyingAddress: '0xdef456' as `0x${string}`,
			receiptAddress: '0xfed789' as `0x${string}`
		},
		selectedToken: {
			address: '0xdef456' as `0x${string}`,
			symbol: 'TEST',
			name: 'Test Token',
			decimals: 18
		},
		selectedBuyOrSell: 'Buy' as const,
		selectedPeriodUnit: 'Days' as const,
		selectedPeriod: '1',
		selectedAmountToken: {
			address: '0xdef456' as `0x${string}`,
			symbol: 'TEST',
			name: 'Test Token',
			decimals: 18
		},
		selectedAmount: BigInt(1000000000000000000), // 1 TEST
		selectedBaseline: '1.5'
	};

	const mockDataFetcher = new DataFetcher(flare.id);

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup mocks
		vi.mocked(DotrainOrderGui.chooseDeployment).mockResolvedValue(
			mockGui as unknown as DotrainOrderGui
		);
		vi.mocked(getPrice).mockResolvedValue('1.5');

		vi.mocked(getPeriodInSeconds).mockReturnValue(86400);
		vi.mocked(getMaxTradeAmount).mockReturnValue(BigInt(100000000000000000)); // 0.1 TEST
		vi.mocked(getBaseline).mockReturnValue('0.6666666666666666');
	});

	it('should call DotrainOrderGui.chooseDeployment with the correct arguments', async () => {
		await getDcaDeploymentArgs(mockOptions, mockDataFetcher);

		expect(DotrainOrderGui.chooseDeployment).toHaveBeenCalledWith(expect.any(String), 'flare');
	});

	it('should save the correct tokens based on Buy/Sell selection', async () => {
		await getDcaDeploymentArgs(mockOptions, mockDataFetcher);

		// For Buy, input = selectedCyToken, output = selectedAmountToken
		expect(mockGui.saveSelectToken).toHaveBeenCalledWith(
			'input',
			mockOptions.selectedCyToken.address
		);
		expect(mockGui.saveSelectToken).toHaveBeenCalledWith(
			'output',
			mockOptions.selectedAmountToken.address
		);

		// Test for Sell
		const sellOptions = { ...mockOptions, selectedBuyOrSell: 'Sell' as const };
		vi.clearAllMocks();
		await getDcaDeploymentArgs(sellOptions, mockDataFetcher);

		// For Sell, input = selectedToken, output = selectedAmountToken
		expect(mockGui.saveSelectToken).toHaveBeenCalledWith(
			'input',
			sellOptions.selectedToken.address
		);
		expect(mockGui.saveSelectToken).toHaveBeenCalledWith(
			'output',
			sellOptions.selectedAmountToken.address
		);
	});

	it('should save the correct field values', async () => {
		await getDcaDeploymentArgs(mockOptions, mockDataFetcher);

		expect(mockGui.saveFieldValue).toHaveBeenCalledWith('time-per-amount-epoch', {
			value: '86400',
			isPreset: false
		});

		expect(mockGui.saveFieldValue).toHaveBeenCalledWith('amount-per-epoch', {
			value: '1',
			isPreset: false
		});

		expect(mockGui.saveFieldValue).toHaveBeenCalledWith('max-trade-amount', {
			value: '0.1',
			isPreset: false
		});

		expect(mockGui.saveFieldValue).toHaveBeenCalledWith('baseline', {
			value: '0.6666666666666666',
			isPreset: false
		});

		expect(mockGui.saveFieldValue).toHaveBeenCalledWith('initial-io', {
			value: '1.5',
			isPreset: false
		});
	});

	it('should handle min-trade-amount correctly for different tokens', async () => {
		// When output token is the first token in the tokens array
		const firstTokenOptions = {
			...mockOptions,
			selectedAmountToken: {
				...tokens[0],
				address: tokens[0].address as `0x${string}`
			}
		};

		await getDcaDeploymentArgs(firstTokenOptions, mockDataFetcher);

		expect(mockGui.saveFieldValue).toHaveBeenCalledWith('min-trade-amount', {
			value: '1',
			isPreset: false
		});

		// When output token is not the first token
		vi.clearAllMocks();
		vi.mocked(getPrice).mockResolvedValue('2.5');

		await getDcaDeploymentArgs(mockOptions, mockDataFetcher);

		expect(mockGui.saveFieldValue).toHaveBeenCalledWith('min-trade-amount', {
			value: '2.5',
			isPreset: false
		});
	});

	it('should save the deposit correctly', async () => {
		await getDcaDeploymentArgs(mockOptions, mockDataFetcher);

		expect(mockGui.saveDeposit).toHaveBeenCalledWith('output', '1');
	});

	it('should throw an error if signer address is not found', async () => {
		// Override the default mock for this test only
		vi.mocked(get).mockReturnValueOnce(undefined);

		await expect(getDcaDeploymentArgs(mockOptions, mockDataFetcher)).rejects.toThrow(
			'Signer address not found'
		);
	});

	it('should return the deployment args and output token', async () => {
		const result = await getDcaDeploymentArgs(mockOptions, mockDataFetcher);

		expect(result).toEqual({
			deploymentArgs: {
				to: '0x1234567890123456789012345678901234567890',
				data: '0xabcdef',
				value: 0n
			},
			outputToken: mockOptions.selectedAmountToken
		});
	});
});

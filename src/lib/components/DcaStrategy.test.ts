import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DcaStrategy from './DcaStrategy.svelte';
import transactionStore from '$lib/transactionStore';
import { useDataFetcher } from '$lib/dataFetcher';
import { Router } from 'sushi/router';

// Mock ethers
vi.mock('ethers', async (importOriginal) => {
	const actual = await importOriginal<typeof import('ethers')>();
	return {
		...actual,
		ethers: {
			...actual.ethers,
			ZeroAddress: '0x0000000000000000000000000000000000000000'
		},
		formatEther: vi.fn().mockImplementation((value: bigint) => value.toString()),
		formatUnits: vi.fn().mockImplementation((value: bigint) => value.toString())
	};
});

// Mock dependencies
vi.mock('$lib/dataFetcher', () => ({
	useDataFetcher: vi.fn()
}));

vi.mock('@wagmi/core', () => ({
	switchNetwork: vi.fn()
}));

vi.mock('svelte-wagmi', async () => {
	const { writable } = await import('svelte/store');
	return {
		wagmiConfig: writable(undefined),
		chainId: writable(undefined),
		signerAddress: writable(undefined)
	};
});

vi.mock('$lib/transactionStore', () => ({
	default: {
		handleDeployDca: vi.fn()
	}
}));

vi.mock('sushi/router', () => ({
	Router: {
		findBestRoute: vi.fn()
	}
}));

// Mock the actual tokens that are being used in the component
vi.mock('$lib/constants', () => {
	const mockTokens = [
		{
			address: '0xfbda5f676cb37624f28265a144a48b0d6e87d3b6',
			symbol: 'USDC.e',
			name: 'Bridged USDC (Stargate)',
			decimals: 6
		}
	];
	return {
		tokensForNetwork: vi.fn(() => mockTokens),
		tokens: mockTokens
	};
});

vi.mock('$lib/stores', async () => {
	const { writable } = await import('svelte/store');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { flare } = require('@wagmi/core/chains');

	const mockCyToken = {
		address: '0xdef4560000000000000000000000000000000000',
		symbol: 'TEST',
		name: 'Test Token',
		decimals: 18,
		underlyingAddress: '0x1234560000000000000000000000000000000000',
		underlyingSymbol: 'UNDERLYING',
		receiptAddress: '0xabcdef0000000000000000000000000000000000'
	};

	const mockNetworkConfig = {
		key: 'flare',
		chain: flare,
		wFLRAddress: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d',
		quoterAddress: '0x5B5513c55fd06e2658010c121c37b07fC8e8B705',
		cusdxAddress: '0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8',
		usdcAddress: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6',
		explorerApiUrl: 'https://flare-explorer.flare.network/api',
		explorerUrl: 'https://flarescan.com',
		orderbookSubgraphUrl:
			'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
		rewardsSubgraphUrl:
			'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-12-11-ab43/gn',
		tokens: [mockCyToken]
	};

	return {
		tokens: writable([mockCyToken]),
		allTokens: writable([mockCyToken]),
		selectedCyToken: writable(mockCyToken),
		selectedNetwork: writable(mockNetworkConfig),
		supportedNetworks: [mockNetworkConfig],
		setActiveNetwork: vi.fn()
	};
});

describe('DcaStrategy Component', () => {
	const mockDataFetcher = {
		getLatestPrice: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		subscribe: vi.fn(),
		web3Client: {
			getGasPrice: vi.fn()
		},
		fetchPoolsForToken: vi.fn(),
		getCurrentPoolCodeMap: vi.fn()
	};
	const mockRoute = {
		amountOutBI: 1500000000000000000n, // 1.5 output tokens
		status: 'Success'
	};

	const fillRequiredFields = async () => {
		await fireEvent.input(screen.getByTestId('amount-input'), { target: { value: '100' } });
		await fireEvent.input(screen.getByTestId('period-input'), { target: { value: '7' } });
		await fireEvent.input(screen.getByTestId('baseline-input'), { target: { value: '1.5' } });
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useDataFetcher).mockReturnValue(mockDataFetcher as any);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(Router.findBestRoute).mockReturnValue(mockRoute as any);
	});

	it('should render the DCA form', () => {
		render(DcaStrategy);

		// Check that key elements are rendered
		expect(screen.getByRole('button', { name: 'Deploy' })).toBeInTheDocument();
		expect(screen.getByText('Every')).toBeInTheDocument();
	});

	it('should update the form when Buy/Sell selection changes', async () => {
		render(DcaStrategy);

		// Find the select element for Buy/Sell
		const selectElements = screen.getAllByRole('combobox');
		const buySelect = selectElements[0]; // First select is likely the Buy/Sell select

		// Initially it should be "Buy"
		expect(buySelect).toHaveValue('Buy');

		// Change to "Sell"
		await fireEvent.change(buySelect, { target: { value: 'Sell' } });

		// Now it should be "Sell"
		expect(buySelect).toHaveValue('Sell');

		// Check that the "for" text appears (instead of "with")
		expect(screen.getByText('for')).toBeInTheDocument();
	});

	it('should call handleDeployDca when Deploy is clicked', async () => {
		render(DcaStrategy);

		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByRole('button', { name: 'Deploy' });
		await fireEvent.click(deployButton);

		// Check that handleDeployDca was called
		expect(transactionStore.handleDeployDca).toHaveBeenCalled();
	});

	it('should update selectedAmountToken when Buy/Sell selection changes', async () => {
		render(DcaStrategy);

		await fillRequiredFields();

		// Find the select element for Buy/Sell
		const selectElements = screen.getAllByRole('combobox');
		const buySelect = selectElements[0]; // First select is likely the Buy/Sell select

		// Click the Deploy button with "Buy" selected
		const deployButton = screen.getByRole('button', { name: 'Deploy' });
		await fireEvent.click(deployButton);

		// Get the first call arguments
		const firstCallArgs = vi.mocked(transactionStore.handleDeployDca).mock.calls[0];
		expect(firstCallArgs[0].selectedBuyOrSell).toBe('Buy');

		// Change to "Sell"
		await fireEvent.change(buySelect, { target: { value: 'Sell' } });

		// Click Deploy again
		await fireEvent.click(deployButton);

		// Get the second call arguments
		const secondCallArgs = vi.mocked(transactionStore.handleDeployDca).mock.calls[1];
		expect(secondCallArgs[0].selectedBuyOrSell).toBe('Sell');
	});

	it('should pass form values to handleDeployDca', async () => {
		// Render the component
		render(DcaStrategy);

		// Fill required fields
		await fillRequiredFields();

		// Find the inputs using test IDs
		const periodInput = screen.getByTestId('period-input');
		const baselineInput = screen.getByTestId('baseline-input');

		// Set values in the form
		await fireEvent.input(periodInput, { target: { value: '7' } });
		await fireEvent.input(baselineInput, { target: { value: '1.5' } });

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDca was called with the correct values
		const callArgs = vi.mocked(transactionStore.handleDeployDca).mock.calls[0][0];

		expect(callArgs.selectedBuyOrSell).toBe('Buy'); // Default value
		expect(callArgs.selectedPeriod).toBe('7');
		expect(callArgs.selectedBaseline).toBe('1.5');
		expect(callArgs.selectedPeriodUnit).toBe('Days'); // Default value
	});

	// Tests for advanced options
	it('should toggle advanced options when clicked', async () => {
		render(DcaStrategy);

		// Advanced options should be hidden initially
		expect(screen.queryByText('Custom deposit amount')).not.toBeInTheDocument();

		// Click the "Show advanced options" button
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Advanced options should now be visible
		expect(screen.getByText('Custom deposit amount')).toBeInTheDocument();
		expect(screen.getByText('Vault ids')).toBeInTheDocument();

		// Click the "Hide advanced options" button
		const hideAdvancedOptionsButton = screen.getByText('Hide advanced options');
		await fireEvent.click(hideAdvancedOptionsButton);

		// Advanced options should be hidden again
		expect(screen.queryByText('Custom deposit amount')).not.toBeInTheDocument();
	});

	// Test for custom deposit amount
	it('should show custom deposit amount input when toggled', async () => {
		render(DcaStrategy);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Custom deposit amount input should not be visible initially
		expect(screen.queryByTestId('deposit-amount-input')).not.toBeInTheDocument();

		// Toggle custom deposit amount
		const customDepositToggle = screen.getByRole('checkbox');
		await fireEvent.click(customDepositToggle);

		// Custom deposit amount input should now be visible
		expect(screen.getByTestId('deposit-amount-input')).toBeInTheDocument();
	});

	// Test for vault ID inputs
	it('should handle vault ID inputs correctly', async () => {
		render(DcaStrategy);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Find vault ID inputs
		const vaultIdInputs = screen.getAllByRole('textbox');
		const inputVaultIdInput = vaultIdInputs.find(
			(input) => input.closest('div')?.previousElementSibling?.textContent === 'Input vault id'
		);
		const outputVaultIdInput = vaultIdInputs.find(
			(input) => input.closest('div')?.previousElementSibling?.textContent === 'Output vault id'
		);

		// Enter valid vault IDs
		if (inputVaultIdInput) {
			await fireEvent.input(inputVaultIdInput, { target: { value: '0x123abc' } });
			await fireEvent.blur(inputVaultIdInput);
		}

		if (outputVaultIdInput) {
			await fireEvent.input(outputVaultIdInput, { target: { value: '0x456def' } });
			await fireEvent.blur(outputVaultIdInput);
		}

		// Fill in required fields
		const amountInput = screen.getByTestId('amount-input');
		const periodInput = screen.getByTestId('period-input');
		const baselineInput = screen.getByTestId('baseline-input');

		await fireEvent.input(amountInput, { target: { value: '100' } });
		await fireEvent.input(periodInput, { target: { value: '7' } });
		await fireEvent.input(baselineInput, { target: { value: '1.5' } });

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDca was called with the correct vault IDs
		const callArgs = vi.mocked(transactionStore.handleDeployDca).mock.calls[0][0];
		expect(callArgs.inputVaultId).toBe('0x123abc');
		expect(callArgs.outputVaultId).toBe('0x456def');
	});

	// Test for invalid vault ID validation
	it('should show error for invalid vault IDs', async () => {
		render(DcaStrategy);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Find vault ID inputs
		const vaultIdInputs = screen.getAllByRole('textbox');
		const inputVaultIdInput = vaultIdInputs.find(
			(input) => input.closest('div')?.previousElementSibling?.textContent === 'Input vault id'
		);

		// Enter invalid vault ID
		if (inputVaultIdInput) {
			await fireEvent.input(inputVaultIdInput, { target: { value: 'not-a-hex-string' } });
			await fireEvent.blur(inputVaultIdInput);
		}

		// Error message should be displayed
		expect(screen.getByText('Invalid vault id: must be a valid hex string')).toBeInTheDocument();

		// Deploy button should be disabled
		const deployButton = screen.getByTestId('deploy-button');
		expect(deployButton).toBeDisabled();
	});

	// Test for period unit selection
	it('should update period unit when changed', async () => {
		render(DcaStrategy);

		// Find the period unit select
		const periodUnitSelect = screen.getByTestId('period-unit-select');

		// Change to "Hours"
		await fireEvent.change(periodUnitSelect, { target: { value: 'Hours' } });

		// Fill in required fields
		const amountInput = screen.getByTestId('amount-input');
		const periodInput = screen.getByTestId('period-input');
		const baselineInput = screen.getByTestId('baseline-input');

		await fireEvent.input(amountInput, { target: { value: '100' } });
		await fireEvent.input(periodInput, { target: { value: '7' } });
		await fireEvent.input(baselineInput, { target: { value: '1.5' } });

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDca was called with the correct period unit
		const callArgs = vi.mocked(transactionStore.handleDeployDca).mock.calls[0][0];
		expect(callArgs.selectedPeriodUnit).toBe('Hours');
	});

	// Test for form validation
	it('should disable Deploy button when required fields are missing', async () => {
		render(DcaStrategy);

		// Deploy button should be disabled initially
		const deployButton = screen.getByTestId('deploy-button');
		expect(deployButton).toBeDisabled();

		// Fill in only some required fields
		const amountInput = screen.getByTestId('amount-input');
		await fireEvent.input(amountInput, { target: { value: '100' } });

		// Button should still be disabled
		expect(deployButton).toBeDisabled();

		// Fill in more fields
		const periodInput = screen.getByTestId('period-input');
		await fireEvent.input(periodInput, { target: { value: '7' } });

		// Button should still be disabled
		expect(deployButton).toBeDisabled();

		// Fill in the last required field
		const baselineInput = screen.getByTestId('baseline-input');
		await fireEvent.input(baselineInput, { target: { value: '1.5' } });

		// Button should now be enabled
		expect(deployButton).not.toBeDisabled();
	});

	// Test for custom deposit amount validation
	it('should validate custom deposit amount', async () => {
		render(DcaStrategy);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Toggle custom deposit amount
		const customDepositToggle = screen.getByRole('checkbox');
		await fireEvent.click(customDepositToggle);

		// Fill in required fields except custom deposit
		const amountInput = screen.getByTestId('amount-input');
		const periodInput = screen.getByTestId('period-input');
		const baselineInput = screen.getByTestId('baseline-input');

		await fireEvent.input(amountInput, { target: { value: '100' } });
		await fireEvent.input(periodInput, { target: { value: '7' } });
		await fireEvent.input(baselineInput, { target: { value: '1.5' } });

		// Deploy button should be disabled because custom deposit is required but empty
		const deployButton = screen.getByTestId('deploy-button');
		expect(deployButton).toBeDisabled();

		// Fill in custom deposit amount
		const depositAmountInput = screen.getByTestId('deposit-amount-input');
		await fireEvent.input(depositAmountInput, { target: { value: '50' } });

		// Button should now be enabled
		expect(deployButton).not.toBeDisabled();
	});

	// Test for TradePrice component
	it('should render TradePrice component with correct tokens', () => {
		render(DcaStrategy);

		// TradePrice component should be rendered
		expect(screen.getByTestId('trade-price')).toBeInTheDocument();
	});
});


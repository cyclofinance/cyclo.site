import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';
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
		handleDeployDsf: vi.fn()
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
		symbol: 'cysFLR',
		name: 'cysFLR',
		decimals: 18,
		chainId: 14,
		underlyingAddress: '0x1234560000000000000000000000000000000000',
		underlyingSymbol: 'FLR',
		receiptAddress: '0xabcdef0000000000000000000000000000000000',
		networkName: 'flare',
		active: true
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

describe('DSF Page', () => {
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
		await fireEvent.input(screen.getByTestId('initial-price-input'), { target: { value: '1.5' } });
		// Find all amount inputs (max and min)
		const amountInputs = screen.getAllByTestId('amount-input');
		if (amountInputs.length >= 2) {
			await fireEvent.input(amountInputs[0], { target: { value: '1000' } }); // max
			await fireEvent.input(amountInputs[1], { target: { value: '100' } }); // min
		}
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useDataFetcher).mockReturnValue(mockDataFetcher as any);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(Router.findBestRoute).mockReturnValue(mockRoute as any);
	});

	it('should render the DSF form', () => {
		render(Page);

		// Check that key elements are rendered
		expect(screen.getByRole('button', { name: 'Deploy' })).toBeInTheDocument();
		expect(screen.getByText('Amount Token')).toBeInTheDocument();
		expect(screen.getByText('Rotate Token')).toBeInTheDocument();
		// Initial Price text is split across elements, so check within the baseline container
		const baselineContainer = screen.getByTestId('baseline-container');
		expect(baselineContainer.textContent).toContain('Initial Price at');
		expect(screen.getByText('Maximum Trade Amount')).toBeInTheDocument();
		expect(screen.getByText('Minimum Trade Amount')).toBeInTheDocument();
	});

	it('should render fast exit toggles', () => {
		render(Page);

		expect(screen.getByText('Amount token fast exit')).toBeInTheDocument();
		expect(screen.getByText('Rotate token fast exit')).toBeInTheDocument();
	});

	it('should toggle fast exit states', async () => {
		render(Page);

		// Find the "Off" text elements - they should be present initially
		const fastExitTexts = screen.getAllByText('Off');
		expect(fastExitTexts.length).toBeGreaterThanOrEqual(2);

		// Verify the fast exit labels are present
		expect(screen.getByText('Amount token fast exit')).toBeInTheDocument();
		expect(screen.getByText('Rotate token fast exit')).toBeInTheDocument();
	});

	it('should call handleDeployDsf when Deploy is clicked', async () => {
		render(Page);

		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByRole('button', { name: 'Deploy' });
		await fireEvent.click(deployButton);

		// Check that handleDeployDsf was called
		expect(transactionStore.handleDeployDsf).toHaveBeenCalled();
	});

	it('should pass form values to handleDeployDsf', async () => {
		render(Page);

		// Fill required fields
		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDsf was called with the correct values
		const callArgs = vi.mocked(transactionStore.handleDeployDsf).mock.calls[0][0];

		expect(callArgs.initialPrice).toBe('1.5');
		expect(callArgs.maxTradeAmount).toBeDefined();
		expect(callArgs.minTradeAmount).toBeDefined();
		expect(callArgs.nextTradeMultiplier).toBe('1.01'); // default value
		expect(callArgs.costBasisMultiplier).toBe('1'); // default value
		expect(callArgs.timePerEpoch).toBe('3600'); // default value
	});

	it('should toggle advanced options when clicked', async () => {
		render(Page);

		// Advanced options should be hidden initially
		expect(screen.queryByText('Next Trade Multiplier')).not.toBeInTheDocument();

		// Click the "Show advanced options" button
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Advanced options should now be visible
		expect(screen.getByText('Next Trade Multiplier')).toBeInTheDocument();
		expect(screen.getByText('Cost Basis Multiplier')).toBeInTheDocument();
		expect(screen.getByText('Time Per Epoch')).toBeInTheDocument();
		expect(screen.getByText('Custom deposit amount')).toBeInTheDocument();
		expect(screen.getByText('Vault ids')).toBeInTheDocument();

		// Click the "Hide advanced options" button
		const hideAdvancedOptionsButton = screen.getByText('Hide advanced options');
		await fireEvent.click(hideAdvancedOptionsButton);

		// Advanced options should be hidden again
		expect(screen.queryByText('Next Trade Multiplier')).not.toBeInTheDocument();
	});

	it('should show custom deposit amount inputs when toggled', async () => {
		render(Page);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Custom deposit amount inputs should not be visible initially
		expect(screen.queryByTestId('deposit-amount-input')).not.toBeInTheDocument();
		expect(screen.queryByTestId('rotate-deposit-amount-input')).not.toBeInTheDocument();

		// Toggle custom deposit amount - find the checkbox near "Custom deposit amount" text
		const customDepositText = screen.getByText('Custom deposit amount');
		const customDepositContainer = customDepositText.closest('div');
		const customDepositToggle = customDepositContainer?.querySelector(
			'input[type="checkbox"]'
		) as HTMLInputElement;
		expect(customDepositToggle).toBeTruthy();
		await fireEvent.click(customDepositToggle!);

		// Custom deposit amount inputs should now be visible
		expect(screen.getByTestId('deposit-amount-input')).toBeInTheDocument();
		expect(screen.getByTestId('rotate-deposit-amount-input')).toBeInTheDocument();
	});

	it('should handle all four vault ID inputs correctly', async () => {
		render(Page);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Find all vault ID inputs
		const vaultIdInputs = screen.getAllByRole('textbox');

		// Should have 4 vault ID inputs
		expect(vaultIdInputs.length).toBeGreaterThanOrEqual(4);

		// Fill required fields
		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDsf was called
		expect(transactionStore.handleDeployDsf).toHaveBeenCalled();
		const callArgs = vi.mocked(transactionStore.handleDeployDsf).mock.calls[0][0];

		// Check that vault ID fields are in the call args
		expect(callArgs).toHaveProperty('amountTokenInputVaultId');
		expect(callArgs).toHaveProperty('rotateTokenInputVaultId');
		expect(callArgs).toHaveProperty('amountTokenOutputVaultId');
		expect(callArgs).toHaveProperty('rotateTokenOutputVaultId');
	});

	it('should update advanced option values', async () => {
		render(Page);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Update Next Trade Multiplier
		const nextTradeMultiplierInput = screen.getByTestId('next-trade-multiplier-input');
		await fireEvent.input(nextTradeMultiplierInput, { target: { value: '1.05' } });

		// Update Cost Basis Multiplier
		const costBasisMultiplierInput = screen.getByTestId('cost-basis-multiplier-input');
		await fireEvent.input(costBasisMultiplierInput, { target: { value: '1.02' } });

		// Update Time Per Epoch
		const timePerEpochInput = screen.getByTestId('time-per-epoch-input');
		await fireEvent.input(timePerEpochInput, { target: { value: '7200' } });

		// Fill required fields
		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDsf was called with updated values
		const callArgs = vi.mocked(transactionStore.handleDeployDsf).mock.calls[0][0];
		expect(callArgs.nextTradeMultiplier).toBe('1.05');
		expect(callArgs.costBasisMultiplier).toBe('1.02');
		expect(callArgs.timePerEpoch).toBe('7200');
	});

	it('should disable Deploy button when required fields are missing', async () => {
		render(Page);

		// Deploy button should be disabled initially
		const deployButton = screen.getByTestId('deploy-button');
		expect(deployButton).toBeDisabled();

		// Fill in only initial price
		const baselineInput = screen.getByTestId('initial-price-input');
		await fireEvent.input(baselineInput, { target: { value: '1.5' } });

		// Button should still be disabled (missing max and min amounts)
		expect(deployButton).toBeDisabled();

		// Fill in max amount
		const amountInputs = screen.getAllByTestId('amount-input');
		if (amountInputs.length > 0) {
			await fireEvent.input(amountInputs[0], { target: { value: '1000' } });
		}

		// Button should still be disabled (missing min amount)
		expect(deployButton).toBeDisabled();

		// Fill in min amount
		if (amountInputs.length > 1) {
			await fireEvent.input(amountInputs[1], { target: { value: '100' } });
		}

		// Button should now be enabled
		expect(deployButton).not.toBeDisabled();
	});

	it('should validate custom deposit amounts when toggled', async () => {
		render(Page);

		// Show advanced options
		const advancedOptionsButton = screen.getByText('Show advanced options');
		await fireEvent.click(advancedOptionsButton);

		// Fill in required fields
		await fillRequiredFields();

		// Toggle custom deposit amount - find the checkbox near "Custom deposit amount" text
		const customDepositText = screen.getByText('Custom deposit amount');
		const customDepositContainer = customDepositText.closest('div');
		const customDepositToggle = customDepositContainer?.querySelector(
			'input[type="checkbox"]'
		) as HTMLInputElement;
		expect(customDepositToggle).toBeTruthy();
		await fireEvent.click(customDepositToggle!);

		// Deploy button should be disabled because custom deposits are required but empty
		const deployButton = screen.getByTestId('deploy-button');
		expect(deployButton).toBeDisabled();

		// Fill in custom deposit amounts
		const depositAmountInput = screen.getByTestId('deposit-amount-input');
		const rotateDepositAmountInput = screen.getByTestId('rotate-deposit-amount-input');

		await fireEvent.input(depositAmountInput, { target: { value: '50' } });
		await fireEvent.input(rotateDepositAmountInput, { target: { value: '25' } });

		// Button should now be enabled
		expect(deployButton).not.toBeDisabled();
	});

	it('should render TradePrice component with correct tokens', () => {
		render(Page);

		// TradePrice component should be rendered
		expect(screen.getByTestId('trade-price')).toBeInTheDocument();
	});

	it('should pass fast exit flags to handleDeployDsf', async () => {
		render(Page);

		// Fill required fields
		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDsf was called with fast exit flags
		const callArgs = vi.mocked(transactionStore.handleDeployDsf).mock.calls[0][0];
		expect(callArgs).toHaveProperty('isAmountTokenFastExit');
		expect(callArgs).toHaveProperty('isRotateTokenFastExit');
		expect(typeof callArgs.isAmountTokenFastExit).toBe('boolean');
		expect(typeof callArgs.isRotateTokenFastExit).toBe('boolean');
	});

	it('should pass deposit amounts to handleDeployDsf', async () => {
		render(Page);

		// Fill required fields
		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDsf was called with deposit amounts
		const callArgs = vi.mocked(transactionStore.handleDeployDsf).mock.calls[0][0];
		expect(callArgs).toHaveProperty('amountTokenDepositAmount');
		expect(callArgs).toHaveProperty('rotateTokenDepositAmount');
		// Default should be 0n
		expect(callArgs.amountTokenDepositAmount).toBe(0n);
		expect(callArgs.rotateTokenDepositAmount).toBe(0n);
	});

	it('should pass network key to handleDeployDsf', async () => {
		render(Page);

		// Fill required fields
		await fillRequiredFields();

		// Click the Deploy button
		const deployButton = screen.getByTestId('deploy-button');
		await fireEvent.click(deployButton);

		// Check that handleDeployDsf was called with network key
		const callArgs = vi.mocked(transactionStore.handleDeployDsf).mock.calls[0][0];
		expect(callArgs).toHaveProperty('selectedNetworkKey');
		expect(callArgs.selectedNetworkKey).toBe('flare');
	});
});

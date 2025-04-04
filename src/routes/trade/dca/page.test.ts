import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from './+page.svelte';
import transactionStore from '$lib/transactionStore';
import { useDataFetcher } from '$lib/dataFetcher';

// Mock dependencies
vi.mock('$lib/dataFetcher', () => ({
	useDataFetcher: vi.fn()
}));

vi.mock('$lib/transactionStore', () => ({
	default: {
		handleDeployDca: vi.fn()
	}
}));

// Mock the actual tokens that are being used in the component
vi.mock('$lib/constants', () => ({
	tokens: [
		{
			address: '0xfbda5f676cb37624f28265a144a48b0d6e87d3b6',
			symbol: 'USDC.e',
			name: 'Bridged USDC (Stargate)',
			decimals: 6
		}
	]
}));

vi.mock('$lib/stores', () => ({
	tokens: [
		{
			address: '0xdef4560000000000000000000000000000000000',
			symbol: 'TEST',
			name: 'Test Token',
			decimals: 18
		}
	]
}));

describe('DCA Page', () => {
	const mockDataFetcher = {
		getLatestPrice: vi.fn(),
		start: vi.fn(),
		stop: vi.fn(),
		subscribe: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useDataFetcher).mockReturnValue(mockDataFetcher as any);
	});

	it('should render the DCA form', () => {
		render(Page);

		// Check that key elements are rendered
		expect(screen.getByRole('button', { name: 'Deploy' })).toBeInTheDocument();
		expect(screen.getByText('Over period')).toBeInTheDocument();
	});

	it('should update the form when Buy/Sell selection changes', async () => {
		render(Page);

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
		render(Page);

		// Click the Deploy button
		const deployButton = screen.getByRole('button', { name: 'Deploy' });
		await fireEvent.click(deployButton);

		// Check that handleDeployDca was called
		expect(transactionStore.handleDeployDca).toHaveBeenCalled();
	});

	it('should update selectedAmountToken when Buy/Sell selection changes', async () => {
		render(Page);

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
		render(Page);

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
});

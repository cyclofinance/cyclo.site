import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TradeAmountInput from './TradeAmountInput.svelte';
import { readErc20BalanceOf, readErc20Decimals } from '../../generated';
import { parseUnits, type Hex } from 'viem';
import TradeAmountInputTest from './TradeAmountInputTest.svelte';
import { get, writable } from 'svelte/store';

// Mock the generated functions
vi.mock('../../generated', () => ({
	readErc20BalanceOf: vi.fn(),
	readErc20Decimals: vi.fn()
}));

// Mock the svelte-wagmi module
vi.mock('svelte-wagmi', () => ({
	signerAddress: {
		subscribe: vi.fn((fn) => {
			fn('0x1234567890123456789012345678901234567890');
			return () => {};
		})
	},
	wagmiConfig: {
		subscribe: vi.fn((fn) => {
			fn({});
			return () => {};
		})
	}
}));

describe('TradeAmountInput Component', () => {
	const mockToken = {
		address: '0xabc123' as `0x${string}`,
		symbol: 'TEST',
		name: 'Test Token',
		decimals: 18
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock the balance and decimals responses
		vi.mocked(readErc20BalanceOf).mockResolvedValue(BigInt(1000000000000000000)); // 1 TEST
		vi.mocked(readErc20Decimals).mockResolvedValue(18);
	});

	it('should render the input with token symbol', async () => {
		render(TradeAmountInput, { props: { amountToken: mockToken } });

		// Check that the token symbol is displayed
		await waitFor(() => {
			expect(screen.getByText('TEST')).toBeInTheDocument();
		});
	});

	it('should display the user balance', async () => {
		render(TradeAmountInput, { props: { amountToken: mockToken } });

		await waitFor(() => {
			expect(screen.getByText('Balance: 1 TEST')).toBeInTheDocument();
		});
	});

	it('should update amount when input changes', async () => {
		const amountStore = writable<bigint>(0n);
		render(TradeAmountInputTest, {
			props: { amountToken: mockToken, amountStore }
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: '0.5' } });

		await waitFor(() => {
			expect(get(amountStore)).toBe(parseUnits('0.5', 18));
		});
	});

	it('should set max value when MAX button is clicked', async () => {
		const amountStore = writable<bigint>(0n);
		render(TradeAmountInputTest, {
			props: { amountToken: mockToken, amountStore }
		});

		await waitFor(() => {
			expect(screen.getByText('Balance: 1 TEST')).toBeInTheDocument();
		});

		const maxButton = screen.getByText('MAX');
		await fireEvent.click(maxButton);

		await waitFor(() => {
			expect(get(amountStore)).toBe(BigInt(1000000000000000000)); // 1 TEST
		});
	});

	it('should reset input when token changes', async () => {
		const amountStore = writable<bigint>(0n);
		const { component } = render(TradeAmountInputTest, {
			props: { amountToken: mockToken, amountStore }
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: '0.5' } });

		await waitFor(() => {
			expect(get(amountStore)).toBe(parseUnits('0.5', 18));
		});

		// Change the token
		const newToken = { ...mockToken, symbol: 'NEW', address: '0xdef456' as Hex };
		await component.$set({ amountToken: newToken });

		await waitFor(() => {
			expect(get(amountStore)).toBe(BigInt(0));
		});
	});

	it('should show loading state while fetching balance', async () => {
		// Make the balance fetch take some time
		vi.mocked(readErc20BalanceOf).mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve(BigInt(1000000000000000000)), 100);
				})
		);

		render(TradeAmountInput, { props: { amountToken: mockToken } });

		expect(screen.getByText('Loading balance...')).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText('Balance: 1 TEST')).toBeInTheDocument();
		});
	});
});

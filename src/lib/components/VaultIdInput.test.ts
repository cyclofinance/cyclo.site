import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VaultIdInput from './VaultIdInput.svelte';
import VaultIdInputTest from './VaultIdInput.test.svelte';
import { isHex } from 'viem';
import { get, writable } from 'svelte/store';

// Mock viem's isHex function
vi.mock('viem', () => ({
	isHex: vi.fn()
}));

describe('VaultIdInput Component', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// Default mock implementation
		vi.mocked(isHex).mockImplementation((value) => {
			return typeof value === 'string' && value.startsWith('0x');
		});
	});

	it('should render with default placeholder', () => {
		render(VaultIdInput);

		const input = screen.getByRole('textbox');
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('placeholder', '0x123...');
	});

	it('should render with custom placeholder', () => {
		render(VaultIdInput, { props: { placeholder: '0xCustom...' } });

		const input = screen.getByRole('textbox');
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute('placeholder', '0xCustom...');
	});

	it('should bind value correctly using a wrapper component', async () => {
		const vaultIdStore = writable('');
		const isErrorStore = writable(false);

		render(VaultIdInputTest, {
			vaultIdStore,
			isErrorStore
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: '0x123abc' } });

		// Check if the store value was updated via the binding
		expect(get(vaultIdStore)).toBe('0x123abc');
	});

	it('should not show error for valid hex input', async () => {
		vi.mocked(isHex).mockReturnValue(true);

		render(VaultIdInput);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: '0x123abc' } });
		await fireEvent.blur(input);

		// Error message should not be displayed
		expect(screen.queryByText(/Invalid vault id/)).not.toBeInTheDocument();
	});

	it('should show error for invalid hex input', async () => {
		vi.mocked(isHex).mockReturnValue(false);

		render(VaultIdInput);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'not-a-hex-string' } });
		await fireEvent.blur(input);

		// Error message should be displayed
		expect(screen.getByText('Invalid vault id: must be a valid hex string')).toBeInTheDocument();
	});

	it('should not validate empty input', async () => {
		render(VaultIdInput);

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: '' } });
		await fireEvent.blur(input);

		// Error message should not be displayed for empty input
		expect(screen.queryByText(/Invalid vault id/)).not.toBeInTheDocument();
	});

	it('should test isError binding using a wrapper component', async () => {
		vi.mocked(isHex).mockReturnValue(false);

		const vaultIdStore = writable('');
		const isErrorStore = writable(false);

		render(VaultIdInputTest, {
			vaultIdStore,
			isErrorStore
		});

		const input = screen.getByRole('textbox');
		await fireEvent.input(input, { target: { value: 'not-a-hex-string' } });
		await fireEvent.blur(input);

		// Check if isError was set to true via the binding
		expect(get(isErrorStore)).toBe(true);
	});
});

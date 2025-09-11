import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ReceiptsTable from './ReceiptsTable.svelte';
import { describe, it, expect, vi } from 'vitest';
import { mockReceipt } from '$lib/mocks/mockReceipt';
import type { CyToken, Receipt } from '$lib/types';
import { formatEther } from 'ethers';

const mockReceipts = [mockReceipt, mockReceipt];

// Mock the getAmountOut function to prevent network calls
vi.mock('$lib/trade/prices', () => ({
	getAmountOut: vi.fn().mockResolvedValue('1.0'), // Mock result as string
	getPrice: vi.fn().mockResolvedValue('1.0')
}));

describe('ReceiptsTable Component', () => {
	const selectedToken: CyToken = {
		name: 'cysFLR',
		address: '0xcdef1234abcdef5678',
		underlyingAddress: '0xabcd1234',
		underlyingSymbol: 'sFLR',
		receiptAddress: '0xeeff5678',
		symbol: 'cysFLR',
		decimals: 18
	};

	it('renders the receipts table with correct headers and data', async () => {
		render(ReceiptsTable, { receipts: mockReceipts as unknown as Receipt[], token: selectedToken });

		expect(screen.getByTestId('headers')).toBeInTheDocument();

		// Wait for async processing to complete
		await waitFor(() => {
			for (let i = 0; i < mockReceipts.length; i++) {
				const lockedPriceElements = screen.getAllByTestId(`locked-price-${i}`);
				const numberHeldElements = screen.getAllByTestId(`number-held-${i}`);
				const totalLockedElements = screen.getAllByTestId(`total-locked-${i}`);

				expect(lockedPriceElements.length).toBeGreaterThan(0);
				expect(numberHeldElements.length).toBeGreaterThan(0);
				expect(totalLockedElements.length).toBeGreaterThan(0);

				expect(lockedPriceElements[0]).toHaveTextContent(
					Number(formatEther(mockReceipts[i].tokenId)).toFixed(5)
				);
				expect(numberHeldElements[0]).toHaveTextContent(
					Number(formatEther(mockReceipts[i].balance)).toFixed(5)
				);
				expect(totalLockedElements[0]).toHaveTextContent(
					Number(mockReceipts[i].readableTotalsFlr).toFixed(5)
				);
			}
		});
	});

	it('opens a receipt modal when redeem button is clicked', async () => {
		render(ReceiptsTable, { receipts: mockReceipts as unknown as Receipt[], token: selectedToken });

		// Wait for async processing to complete
		await waitFor(() => {
			const redeemButtons = screen.getAllByTestId('redeem-button-0');
			expect(redeemButtons.length).toBeGreaterThan(0);
		});

		const redeemButtons = screen.getAllByTestId('redeem-button-0');
		await fireEvent.click(redeemButtons[0]);

		await waitFor(() => {
			expect(screen.getByTestId('receipt-modal')).toBeInTheDocument();
		});
	});

	it('renders mobile card layout', async () => {
		render(ReceiptsTable, { receipts: mockReceipts as unknown as Receipt[], token: selectedToken });

		await waitFor(() => {
			for (let i = 0; i < mockReceipts.length; i++) {
				expect(screen.getByTestId(`receipt-card-${i}`)).toBeInTheDocument();
			}
		});
	});

	it('renders profit-loss elements with correct data', async () => {
		render(ReceiptsTable, { receipts: mockReceipts as unknown as Receipt[], token: selectedToken });

		await waitFor(() => {
			for (let i = 0; i < mockReceipts.length; i++) {
				const profitLossElements = screen.getAllByTestId(`profit-loss-${i}`);
				expect(profitLossElements.length).toBeGreaterThan(0);
				// The mock receipt shows the actual calculated profit loss
				expect(profitLossElements[0]).toHaveTextContent('+0.60000');
			}
		});
	});
});

import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TransactionModal from './TransactionModal.svelte';
import { TransactionStatus } from '$lib/transactionStore';
import userEvent from '@testing-library/user-event';

const { mockTransactionStore } = await vi.hoisted(() => import('$lib/mocks/mockTransactionStore'));
vi.mock('$lib/transactionStore', async (importOriginal) => {
	return {
		...((await importOriginal()) as object),
		default: mockTransactionStore
	};
});
describe('TransactionModal Component', () => {
	const resetSpy = vi.spyOn(mockTransactionStore, 'reset');

	beforeEach(() => {
		resetSpy.mockClear();
		mockTransactionStore.reset();
	});

	it('should render correctly in IDLE state', async () => {
		render(TransactionModal);
		expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument();
	});

	it('should display an error when transaction fails', async () => {
		mockTransactionStore.mockSetSubscribeValue({
			status: TransactionStatus.ERROR,
			error: 'Transaction failed',
			hash: '0xMockTransactionHash'
		});

		render(TransactionModal);

		await waitFor(() => {
			expect(screen.getByTestId('error-icon')).toBeInTheDocument();
			expect(screen.getByTestId('error-message')).toHaveTextContent('Transaction failed');
			expect(screen.getByTestId('view-transaction-link')).toHaveAttribute(
				'href',
				'https://flarescan.com/tx/0xMockTransactionHash'
			);
		});

		// Test dismiss button click using userEvent
		const dismissButton = screen.getByTestId('dismiss-button');
		await userEvent.click(dismissButton);
		expect(resetSpy).toHaveBeenCalled();
	});

	it('should display success message when transaction succeeds', async () => {
		mockTransactionStore.mockSetSubscribeValue({
			status: TransactionStatus.SUCCESS,
			message: 'Transaction succeeded',
			hash: '0xMockTransactionHash'
		});

		render(TransactionModal);

		await waitFor(() => {
			expect(screen.getByTestId('success-icon')).toBeInTheDocument();
			expect(screen.getByTestId('success-message')).toHaveTextContent('Transaction succeeded');
			expect(screen.getByTestId('view-transaction-link')).toHaveAttribute(
				'href',
				'https://flarescan.com/tx/0xMockTransactionHash'
			);
			expect(screen.getByTestId('sell-cysflr-link')).toHaveAttribute(
				'href',
				'https://sparkdex.ai/swap/'
			);
		});

		const dismissButton = screen.getByTestId('dismiss-button');
		await userEvent.click(dismissButton);
		expect(resetSpy).toHaveBeenCalled();
	});

	it('should display pending state with a spinner for pending transactions', async () => {
		mockTransactionStore.mockSetSubscribeValue({
			status: TransactionStatus.PENDING_WALLET,
			message: 'Waiting for wallet confirmation...'
		});

		render(TransactionModal);

		await waitFor(() => {
			expect(screen.getByTestId('pending-message')).toHaveTextContent(
				'Waiting for wallet confirmation...'
			);
			expect(screen.getByTestId('spinner')).toBeInTheDocument();
		});
	});

	it('should handle multiple statuses like CHECKING_ALLOWANCE and PENDING_APPROVAL', async () => {
		mockTransactionStore.mockSetSubscribeValue({
			status: TransactionStatus.CHECKING_ALLOWANCE,
			message: 'Checking your approved sFLR spend...'
		});

		render(TransactionModal);

		await waitFor(() => {
			expect(screen.getByTestId('pending-message')).toHaveTextContent(
				'Checking your approved sFLR spend...'
			);
		});

		mockTransactionStore.mockSetSubscribeValue({
			status: TransactionStatus.PENDING_APPROVAL,
			message: 'Approving sFLR spend...'
		});

		await waitFor(() => {
			expect(screen.getByTestId('pending-message')).toHaveTextContent('Approving sFLR spend...');
		});
	});
});

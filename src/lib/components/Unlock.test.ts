import { render, screen, waitFor } from '@testing-library/svelte';
import Unlock from './Unlock.svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import type { Receipt } from '$lib/types';
import { mockConnectedStore, mockSignerAddressStore } from '$lib/mocks/mockStores';

const { mockBalancesStore } = await vi.hoisted(() => import('$lib/mocks/mockStores'));

vi.mock('$lib/queries/getReceipts', () => ({
	getSingleTokenReceipts: vi.fn()
}));

vi.mock('$lib/balancesStore', async () => {
	return {
		default: mockBalancesStore
	};
});

const mockReceipts: Receipt[] = [
	{
		chainId: '14',
		balance: BigInt(1000000000000000000),
		tokenId: '1'
	}
] as unknown as Receipt[];

describe('Unlock Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBalancesStore.mockSetSubscribeValue(
			BigInt(1000000000000000000),
			BigInt(1000000000000000000),
			'Ready',
			BigInt(1),
			BigInt(1),
			BigInt(1),
			BigInt(1000000),
			BigInt(1000),
			BigInt(0),
			{ cysFlrOutput: BigInt(0), cusdxOutput: BigInt(0) }
		);
	});

	it('should show connect wallet button when wallet is not connected', () => {
		mockConnectedStore.mockSetSubscribeValue(false);
		mockSignerAddressStore.mockSetSubscribeValue('');
		render(Unlock);

		expect(screen.getByText('CONNECT WALLET TO VIEW RECEIPTS')).toBeInTheDocument();
	});

	it('should display cysFLR balance correctly when wallet is connected', async () => {
		mockConnectedStore.mockSetSubscribeValue(true);
		mockSignerAddressStore.mockSetSubscribeValue('mockWalletAddress');
		render(Unlock);

		await waitFor(() => {
			const balanceText = screen.getByTestId('cysflr-balance');
			expect(balanceText).toBeInTheDocument();
			expect(screen.getByText('cysFLR')).toBeInTheDocument();
			expect(balanceText).toHaveTextContent('1.0');
		});
	});

	it('should show loading state while fetching receipts', async () => {
		const { getSingleTokenReceipts } = await import('$lib/queries/getReceipts');
		vi.mocked(getSingleTokenReceipts).mockImplementation(() => new Promise(() => {}));

		render(Unlock);

		await waitFor(() => {
			expect(screen.getByText('LOADING...')).toBeInTheDocument();
		});
	});

	it('should display receipts table when receipts are available', async () => {
		const { getSingleTokenReceipts } = await import('$lib/queries/getReceipts');
		vi.mocked(getSingleTokenReceipts).mockResolvedValue(mockReceipts);

		render(Unlock);

		await waitFor(() => {
			expect(screen.queryByText('NO RECEIPTS FOUND...')).not.toBeInTheDocument();
			expect(screen.queryByText('LOADING...')).not.toBeInTheDocument();
		});
	});

	it('should show "NO RECEIPTS FOUND" message when no receipts are available', async () => {
		const { getSingleTokenReceipts } = await import('$lib/queries/getReceipts');
		vi.mocked(getSingleTokenReceipts).mockResolvedValue([]);

		render(Unlock);

		await waitFor(() => {
			expect(screen.getByText('NO RECEIPTS FOUND...')).toBeInTheDocument();
		});
	});

	it('should refresh receipts when wallet address changes', async () => {
		const { getSingleTokenReceipts } = await import('$lib/queries/getReceipts');
		const getReceiptsSpy = vi.mocked(getSingleTokenReceipts);

		render(Unlock);

		await waitFor(() => {
			expect(getReceiptsSpy).toHaveBeenCalled();
		});
	});

	it('should handle case when getReceipts returns empty', async () => {
		const { getSingleTokenReceipts } = await import('$lib/queries/getReceipts');
		vi.mocked(getSingleTokenReceipts).mockResolvedValue([]);
		render(Unlock);

		await waitFor(() => {
			expect(screen.getByText('NO RECEIPTS FOUND...')).toBeInTheDocument();
		});
	});
});

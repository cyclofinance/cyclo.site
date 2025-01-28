import { describe, it, expect, vi, beforeEach, type Mock, afterAll } from 'vitest';
import { get } from 'svelte/store';
import transactionStore, { TransactionStatus } from './transactionStore';
import {
	readErc20Allowance,
	writeErc20Approve,
	writeErc20PriceOracleReceiptVaultDeposit,
	writeErc20PriceOracleReceiptVaultRedeem
} from '../generated';
import { waitForTransactionReceipt, type Config } from '@wagmi/core';
import { waitFor } from '@testing-library/svelte';
import { TransactionErrorMessage } from './types/errors';
import type { CyToken } from '$lib/types';
import { mockWagmiConfigStore } from '$lib/mocks/mockStores';
import balancesStore from './balancesStore';

vi.mock('$lib/queries/getReceipts', () => ({
	getReceipts: vi.fn(),
	refreshAllReceipts: vi.fn()
}));

vi.mock('./balancesStore', () => ({
	default: {
		refreshBalances: vi.fn().mockResolvedValue('mocked balance') // Mock the refreshBalances function
	}
}));

vi.mock('../generated', () => ({
	readErc20BalanceOf: vi.fn(),
	readErc20Allowance: vi.fn(),
	writeErc20Approve: vi.fn(),
	writeErc20PriceOracleReceiptVaultDeposit: vi.fn(),
	writeErc20PriceOracleReceiptVaultRedeem: vi.fn(),
	readErc1155IsApprovedForAll: vi.fn(),
	writeErc1155SetApprovalForAll: vi.fn()
}));

vi.mock('@wagmi/core', () => ({
	waitForTransactionReceipt: vi.fn()
}));

describe('transactionStore', () => {
	const mockSignerAddress = '0x1234567890abcdef';
	const mockSelectedToken: CyToken = {
		name: 'cysFLR',
		address: '0xcdef1234abcdef5678',
		underlyingAddress: '0xabcd1234',
		underlyingSymbol: 'sFLR',
		receiptAddress: '0xeeff5678'
	};
	const mockTokenId = '1';
	const mockAssets = BigInt(1000);

	const {
		reset,
		checkingWalletAllowance,
		handleLockTransaction,
		handleUnlockTransaction,
		awaitWalletConfirmation,
		awaitApprovalTx,
		awaitLockTx,
		awaitUnlockTx,
		transactionSuccess,
		transactionError
	} = transactionStore;

	beforeEach(() => {
		vi.resetAllMocks();
		vi.clearAllMocks();
		reset();
	});
	afterAll(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
		reset();
	});

	it('should update status to CHECKING_ALLOWANCE', () => {
		checkingWalletAllowance('');
		expect(get(transactionStore).status).toBe(TransactionStatus.CHECKING_ALLOWANCE);
	});

	it('should update status to PENDING_WALLET with message', () => {
		awaitWalletConfirmation('Waiting for wallet confirmation...');
		expect(get(transactionStore).status).toBe(TransactionStatus.PENDING_WALLET);
		expect(get(transactionStore).message).toBe('Waiting for wallet confirmation...');
	});

	it('should update status to PENDING_APPROVAL', () => {
		awaitApprovalTx('mockHash');
		expect(get(transactionStore).status).toBe(TransactionStatus.PENDING_APPROVAL);
		expect(get(transactionStore).hash).toBe('mockHash');
		expect(get(transactionStore).message).toBe('');
	});

	it('should update status to PENDING_LOCK', () => {
		awaitLockTx('mockLockHash');
		expect(get(transactionStore).status).toBe(TransactionStatus.PENDING_LOCK);
		expect(get(transactionStore).hash).toBe('mockLockHash');
		expect(get(transactionStore).message).toBe('');
	});

	it('should update status to PENDING_UNLOCK', () => {
		awaitUnlockTx('mockUnlockHash');
		expect(get(transactionStore).status).toBe(TransactionStatus.PENDING_UNLOCK);
		expect(get(transactionStore).hash).toBe('mockUnlockHash');
		expect(get(transactionStore).message).toBe('');
	});

	it('should update status to SUCCESS', () => {
		transactionSuccess('mockSuccessHash', 'Transaction completed successfully');
		expect(get(transactionStore).status).toBe(TransactionStatus.SUCCESS);
		expect(get(transactionStore).hash).toBe('mockSuccessHash');
		expect(get(transactionStore).message).toBe('Transaction completed successfully');
	});

	it('should update status to ERROR', () => {
		transactionError(TransactionErrorMessage.GENERIC, 'mockErrorHash');
		expect(get(transactionStore).status).toBe(TransactionStatus.ERROR);
		expect(get(transactionStore).error).toBe(TransactionErrorMessage.GENERIC);
		expect(get(transactionStore).hash).toBe('mockErrorHash');
	});

	it('should update status to ERROR without hash', () => {
		transactionError(TransactionErrorMessage.GENERIC);
		expect(get(transactionStore).status).toBe(TransactionStatus.ERROR);
		expect(get(transactionStore).error).toBe(TransactionErrorMessage.GENERIC);
		expect(get(transactionStore).hash).toBe('');
	});

	it('should initialize with the correct default state', () => {
		expect(get(transactionStore)).toEqual({
			status: TransactionStatus.IDLE,
			error: '',
			hash: '',
			data: null,
			functionName: '',
			message: ''
		});
	});

	it('should reset the store to its initial state', () => {
		handleLockTransaction({
			signerAddress: mockSignerAddress,
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			assets: mockAssets
		});
		reset();
		expect(get(transactionStore)).toEqual({
			status: TransactionStatus.IDLE,
			error: '',
			hash: '',
			data: null,
			functionName: '',
			message: ''
		});
	});

	it('should prompt the user to approve cysFLR contract to lock sFLR if allowance is less than assets', async () => {
		const mockAllowance = BigInt(500);

		(readErc20Allowance as Mock).mockResolvedValueOnce(mockAllowance);

		await handleLockTransaction({
			signerAddress: '0x123',
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			assets: BigInt(1000)
		});

		awaitWalletConfirmation('You need to approve the cysFLR contract to lock your SFLR...');

		expect(get(transactionStore).status).toBe(TransactionStatus.PENDING_WALLET);
	});

	it('should handle successful lock transaction', async () => {
		(readErc20Allowance as Mock).mockResolvedValue(BigInt(1000));
		(writeErc20Approve as Mock).mockResolvedValue('mockApproveHash');
		(writeErc20PriceOracleReceiptVaultDeposit as Mock).mockResolvedValue('mockDepositHash');
		(waitForTransactionReceipt as Mock).mockResolvedValue({
			status: 'success',
			transactionHash: 'mockDepositHash',
			chainId: 1
		});

		await handleLockTransaction({
			signerAddress: mockSignerAddress,
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			assets: BigInt(100)
		});
		expect(balancesStore.refreshBalances).toHaveBeenCalledWith(
			mockWagmiConfigStore,
			mockSignerAddress
		);

		expect(get(transactionStore).status).toBe(TransactionStatus.SUCCESS);
		expect(get(transactionStore).hash).toBe('mockDepositHash');
	});

	it('should handle user rejecting spend approval', async () => {
		const mockAllowance = BigInt(100);
		const assets = BigInt(500);

		(readErc20Allowance as Mock).mockResolvedValueOnce(mockAllowance);
		(writeErc20Approve as Mock).mockRejectedValue(new Error('UserRejectedRequestError'));

		await handleLockTransaction({
			signerAddress: '0x123',
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			assets
		});

		await waitFor(() => {
			expect(get(transactionStore).status).toBe(TransactionStatus.ERROR);
			expect(get(transactionStore).error).toBe(TransactionErrorMessage.USER_REJECTED_APPROVAL);
		});
	});

	it('should handle user rejecting lock transaction confirmation', async () => {
		(readErc20Allowance as Mock).mockResolvedValue(BigInt(500));
		(writeErc20Approve as Mock).mockResolvedValue('mockApproveHash');
		(writeErc20PriceOracleReceiptVaultDeposit as Mock).mockRejectedValue(
			new Error('UserRejectedRequestError')
		);

		await handleLockTransaction({
			signerAddress: mockSignerAddress,
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			assets: BigInt(100)
		});

		expect(get(transactionStore).status).toBe(TransactionStatus.ERROR);
		expect(get(transactionStore).error).toBe(TransactionErrorMessage.USER_REJECTED_LOCK);
	});

	it('should handle successful unlock transaction', async () => {
		(writeErc20PriceOracleReceiptVaultRedeem as Mock).mockResolvedValue('mockRedeemHash');
		(waitForTransactionReceipt as Mock).mockResolvedValue(true);

		await handleUnlockTransaction({
			signerAddress: mockSignerAddress,
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			erc1155Address: mockSelectedToken.receiptAddress,
			tokenId: mockTokenId,
			assets: BigInt(100)
		});

		await waitFor(() => {
			expect(get(transactionStore).status).toBe(TransactionStatus.SUCCESS);
		});
		expect(get(transactionStore).hash).toBe('mockRedeemHash');
	});

	it('should handle transaction failure during lock', async () => {
		(readErc20Allowance as Mock).mockResolvedValue(BigInt(500));
		(writeErc20Approve as Mock).mockResolvedValue('mockApproveHash');
		(waitForTransactionReceipt as Mock).mockRejectedValue('hash');
		(writeErc20PriceOracleReceiptVaultDeposit as Mock).mockResolvedValue(
			new Error('Transaction failed')
		);

		await handleLockTransaction({
			signerAddress: mockSignerAddress,
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			assets: BigInt(100)
		});

		expect(get(transactionStore).status).toBe(TransactionStatus.ERROR);
		expect(get(transactionStore).error).toBe(TransactionErrorMessage.LOCK_FAILED);
	});

	it('should handle transaction failure during unlock', async () => {
		(writeErc20PriceOracleReceiptVaultRedeem as Mock).mockResolvedValue('mockRedeemHash');
		(waitForTransactionReceipt as Mock).mockRejectedValue(new Error('Receipt failed'));

		await handleUnlockTransaction({
			signerAddress: mockSignerAddress,
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			erc1155Address: mockSelectedToken.receiptAddress,
			tokenId: mockTokenId,
			assets: BigInt(100)
		});

		await waitFor(() => {
			expect(get(transactionStore).status).toBe(TransactionStatus.ERROR);
			expect(get(transactionStore).error).toBe(TransactionErrorMessage.UNLOCK_FAILED);
		});
		expect(get(transactionStore).hash).toBe('mockRedeemHash');
	});

	it('should handle user rejecting unlock transaction', async () => {
		(writeErc20PriceOracleReceiptVaultRedeem as Mock).mockResolvedValue('mockRedeemHash');
		(writeErc20PriceOracleReceiptVaultRedeem as Mock).mockRejectedValue(
			new Error('UserRejectedRequestError')
		);

		await handleUnlockTransaction({
			signerAddress: mockSignerAddress,
			config: mockWagmiConfigStore as unknown as Config,
			selectedToken: mockSelectedToken,
			erc1155Address: mockSelectedToken.receiptAddress,
			tokenId: mockTokenId,
			assets: BigInt(100)
		});

		await waitFor(() => {
			expect(get(transactionStore).status).toBe(TransactionStatus.ERROR);
			expect(get(transactionStore).error).toBe(TransactionErrorMessage.USER_REJECTED_UNLOCK);
		});
	});
});

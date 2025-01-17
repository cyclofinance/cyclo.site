import { writable } from 'svelte/store';
import type { Hex } from 'viem';
import type { Config } from '@wagmi/core';
import { waitForTransactionReceipt } from '@wagmi/core';
import {
	readErc20Allowance,
	writeErc20Approve,
	writeErc20PriceOracleReceiptVaultDeposit,
	writeErc20PriceOracleReceiptVaultRedeem
} from '../generated';
import balancesStore from './balancesStore';
import { myReceipts } from './stores';
import { refreshAllReceipts } from './queries/getReceipts';
import { TransactionErrorMessage } from './types/errors';
import type { CyToken } from './types';

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const ONE = BigInt('1000000000000000000');

export enum TransactionStatus {
	IDLE = 'Idle',
	CHECKING_ALLOWANCE = 'Checking your approved spend...',
	PENDING_WALLET = 'Waiting for wallet confirmation...',
	PENDING_APPROVAL = 'Approving spend...',
	PENDING_LOCK = 'Locking...',
	PENDING_UNLOCK = 'Unlocking...',
	SUCCESS = 'Success! Transaction confirmed',
	ERROR = 'Something went wrong'
}

export type initiateLockTransactionArgs = {
	signerAddress: string | null;
	selectedToken: CyToken;
	assets: bigint;
	config: Config;
};

export type InitiateUnlockTransactionArgs = {
	signerAddress: string | null;
	selectedToken: CyToken;
	assets: bigint;
	config: Config;
	tokenId: string;
};

const initialState = {
	status: TransactionStatus.IDLE,
	error: '',
	hash: '',
	data: null,
	functionName: '',
	message: ''
};

const transactionStore = () => {
	const { subscribe, set, update } = writable(initialState);
	const reset = () => set(initialState);

	const checkingWalletAllowance = (message?: string) =>
		update((state) => ({
			...state,
			status: TransactionStatus.CHECKING_ALLOWANCE,
			message: message || ''
		}));
	const awaitWalletConfirmation = (message?: string) =>
		update((state) => ({
			...state,
			status: TransactionStatus.PENDING_WALLET,
			message: message || ''
		}));
	const awaitApprovalTx = (hash: string) =>
		update((state) => ({
			...state,
			hash: hash,
			status: TransactionStatus.PENDING_APPROVAL,
			message: ''
		}));
	const awaitLockTx = (hash: string) =>
		update((state) => ({
			...state,
			hash: hash,
			status: TransactionStatus.PENDING_LOCK,
			message: ''
		}));
	const awaitUnlockTx = (hash: string) =>
		update((state) => ({
			...state,
			hash: hash,
			status: TransactionStatus.PENDING_UNLOCK,
			message: ''
		}));
	const transactionSuccess = (hash: string, message?: string) =>
		update((state) => ({
			...state,
			status: TransactionStatus.SUCCESS,
			hash: hash,
			message: message || ''
		}));
	const transactionError = (message: TransactionErrorMessage, hash?: string) =>
		update((state) => ({
			...state,
			status: TransactionStatus.ERROR,
			error: message,
			hash: hash || ''
		}));

	const handleLockTransaction = async ({
		signerAddress,
		config,
		selectedToken,
		assets
	}: initiateLockTransactionArgs) => {
		const writeLock = async () => {
			let hash: Hex | undefined;
			// GET WALLET CONFIRMATION
			try {
				awaitWalletConfirmation('Awaiting wallet confirmation to lock...');
				hash = await writeErc20PriceOracleReceiptVaultDeposit(config, {
					address: selectedToken.address,
					args: [assets, signerAddress as Hex, 0n, '0x']
				});
			} catch (e) {
				console.log(e);
				return transactionError(TransactionErrorMessage.USER_REJECTED_LOCK);
			}
			awaitLockTx(hash);
			// WAIT FOR TX RECEIPT
			try {
				await waitForTransactionReceipt(config, { confirmations: 4, hash: hash });
			} catch {
				return transactionError(TransactionErrorMessage.LOCK_FAILED, hash);
			}
			// UPDATE BALANCES AND RECEIPTS
			try {
				await balancesStore.refreshBalances(config, signerAddress as Hex);
				const getReceiptsResult = await refreshAllReceipts(signerAddress as Hex, config);
				if (getReceiptsResult) {
					myReceipts.set(getReceiptsResult);
				}
			} catch {
				return transactionError(TransactionErrorMessage.BALANCE_REFRESH_FAILED, hash);
			}
			// SUCCESS
			return transactionSuccess(
				hash,
				`Congrats! You've successfully locked your ${selectedToken.underlyingSymbol} in return for ${selectedToken.name}. You can burn your ${selectedToken.name} and receipts to redeem your original ${selectedToken.underlyingSymbol} at any time, or trade your ${selectedToken.name} on the Flare Network.`
			);
		};

		checkingWalletAllowance();

		const data = await readErc20Allowance(config, {
			address: selectedToken.underlyingAddress,
			args: [signerAddress as Hex, selectedToken.address]
		});

		if (data < assets) {
			awaitWalletConfirmation(
				`You need to approve the ${selectedToken.name} contract to lock your ${selectedToken.underlyingSymbol}...`
			);
			// GET WALLET CONFIRMATION FOR APPROVAL
			let hash: Hex | undefined;
			try {
				hash = await writeErc20Approve(config, {
					address: selectedToken.underlyingAddress,
					args: [selectedToken.address, assets]
				});
			} catch {
				return transactionError(TransactionErrorMessage.USER_REJECTED_APPROVAL);
			}

			awaitApprovalTx(hash);
			// WAIT FOR TX RECEIPT FOR APPROVAL
			try {
				await waitForTransactionReceipt(config, { hash: hash });
			} catch {
				return transactionError(TransactionErrorMessage.TIMEOUT, hash);
			}

			// WRITE LOCK TRANSACTION
			return writeLock();
		} else {
			// WRITE LOCK TRANSACTION
			return writeLock();
		}
	};

	const handleUnlockTransaction = async ({
		signerAddress,
		config,
		selectedToken,
		tokenId,
		assets
	}: InitiateUnlockTransactionArgs) => {
		const writeUnlock = async () => {
			let hash: Hex | undefined;
			// GET WALLET CONFIRMATION
			try {
				awaitWalletConfirmation(
					`Awaiting wallet confirmation to unlock your ${selectedToken.underlyingSymbol} ...`
				);
				hash = await writeErc20PriceOracleReceiptVaultRedeem(config, {
					address: selectedToken.address,
					args: [assets, signerAddress as Hex, signerAddress as Hex, BigInt(tokenId), '0x']
				});
			} catch {
				return transactionError(TransactionErrorMessage.USER_REJECTED_UNLOCK);
			}
			awaitUnlockTx(hash);
			// WAIT FOR TX RECEIPT
			try {
				await waitForTransactionReceipt(config, { confirmations: 4, hash: hash });
			} catch {
				return transactionError(TransactionErrorMessage.UNLOCK_FAILED, hash);
			}
			// UPDATE BALANCES AND RECEIPTS
			try {
				await balancesStore.refreshBalances(config, signerAddress as Hex);
				const getReceiptsResult = await refreshAllReceipts(signerAddress as Hex, config);
				if (getReceiptsResult) {
					myReceipts.set(getReceiptsResult);
				}
			} catch {
				return transactionError(TransactionErrorMessage.BALANCE_REFRESH_FAILED, hash);
			}
			// SUCCESS
			return transactionSuccess(hash);
		};

		writeUnlock();
	};

	return {
		subscribe,
		reset,
		handleLockTransaction,
		handleUnlockTransaction,
		checkingWalletAllowance,
		awaitWalletConfirmation,
		awaitApprovalTx,
		awaitLockTx,
		awaitUnlockTx,
		transactionSuccess,
		transactionError
	};
};

export default transactionStore();

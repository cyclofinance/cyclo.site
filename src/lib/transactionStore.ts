import { get, writable } from 'svelte/store';
import type { Hex } from 'viem';
import type { Config } from '@wagmi/core';
import { encodeFunctionData } from 'viem';
import {
	readContract,
	readContracts,
	sendTransaction,
	waitForTransactionReceipt
} from '@wagmi/core';
import {
	readErc20Allowance,
	writeErc20Approve,
	writeErc20PriceOracleReceiptVaultDeposit,
	writeErc20PriceOracleReceiptVaultRedeem
} from '../generated';
import balancesStore from './balancesStore';
import { myReceipts, orderbookSubgraphUrl } from './stores';
import { refreshAllReceipts } from './queries/refreshAllReceipts';
import { TransactionErrorMessage } from './types/errors';
import type { CyToken } from './types';
import { getTransactionAddOrders } from '@rainlanguage/orderbook/js_api';
import { wagmiConfig } from 'svelte-wagmi';
import { getDcaDeploymentArgs, type DcaDeploymentArgs } from './trade/getDeploymentArgs';
import type { DataFetcher } from 'sushi';
import {
	DEFAULT_PYTH_ADDR,
	extractParsedTimes,
	extractPublishTime,
	fetchUpdateBlobs,
	PYTH_UPDATE_ABI,
	toU64
} from './pyth';

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
	erc1155Address: string;
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
				`Congrats! You've successfully locked your ${selectedToken.underlyingSymbol} in return for ${selectedToken.name}. You can burn your ${selectedToken.name} and receipts to redeem your original ${selectedToken.underlyingSymbol} at any time, or trade your ${selectedToken.name} on ${selectedToken.networkName}.`
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

	const handleDeployDca = async (options: DcaDeploymentArgs, dataFetcher: DataFetcher) => {
		const config = get(wagmiConfig);
		if (!config) throw new Error('Wagmi config not found');

		awaitWalletConfirmation(`Preparing strategy...`);

		const { deploymentArgs, outputToken } = await getDcaDeploymentArgs(options, dataFetcher);
		const pollingSubgraphUrl = get(orderbookSubgraphUrl);
		const networkChainId = options.selectedCyToken.chainId;

		if (deploymentArgs.approvals.length > 0) {
			awaitWalletConfirmation(`Awaiting wallet confirmation to approve ${outputToken.symbol}...`);
			await sendTransaction(config, {
				data: deploymentArgs.approvals[0].calldata as Hex,
				to: deploymentArgs.approvals[0].token as `0x${string}`
			});
		}

		awaitWalletConfirmation(`Awaiting wallet confirmation to deploy your DCA strategy...`);

		const hash = await sendTransaction(config, {
			data: deploymentArgs.deploymentCalldata as Hex,
			to: deploymentArgs.orderbookAddress as `0x${string}`
		});

		// Poll for the order to be added to the orderbook
		const interval = setInterval(async () => {
			const orders = await getTransactionAddOrders(pollingSubgraphUrl, hash);
			if (orders.length > 0) {
				clearInterval(interval);
				const orderHash = orders[0].order.orderHash;
				const orderbookId = orders[0].order.orderbook.id;
				const link = `
				<a
								target="_blank"
								class="whitespace-pre-wrap break-words text-center hover:underline"
								href="https://raindex.finance/orders/${networkChainId}-${orderbookId}-${orderHash}"
								data-testid="raindex-link">Manage your order on Raindex</a
							>
				`;

				return transactionSuccess(hash, link);
			}
		}, 2000);
	};

	const handlePythPriceUpdate = async (
		pythContractAddress: `0x${string}` = DEFAULT_PYTH_ADDR,
		priceIds: `0x${string}`[]
	) => {
		const config = get(wagmiConfig);
		if (!config) throw new Error('Wagmi config not found');
		if (!priceIds?.length) throw new Error('No priceIds provided');

		const { updateData, parsed } = await fetchUpdateBlobs(priceIds);

		const parsedMap = extractParsedTimes({ parsed }); // keep same extractor
		const publishTimes: bigint[] = Array(priceIds.length).fill(0n);
		const fallbackIdxs: number[] = [];

		for (let i = 0; i < priceIds.length; i++) {
			const key = priceIds[i].toLowerCase();
			if (parsedMap[key] !== undefined) {
				publishTimes[i] = toU64(parsedMap[key]);
			} else {
				fallbackIdxs.push(i);
			}
		}

		if (fallbackIdxs.length) {
			// batch fallback via readContracts
			const contracts = fallbackIdxs.map((idx) => ({
				abi: PYTH_UPDATE_ABI,
				address: pythContractAddress,
				functionName: 'getPriceUnsafe' as const,
				args: [priceIds[idx]]
			}));
			const results = await readContracts(config, { contracts });
			results.forEach((r, k) => {
				const pt = extractPublishTime(r.result);
				publishTimes[fallbackIdxs[k]] = toU64(pt + 1n);
			});
		}

		// 3) Exact fee
		const fee = (await readContract(config, {
			abi: PYTH_UPDATE_ABI,
			address: pythContractAddress,
			functionName: 'getUpdateFee',
			args: [updateData]
		})) as bigint;

		const data = encodeFunctionData({
			abi: PYTH_UPDATE_ABI,
			functionName: 'updatePriceFeedsIfNecessary',
			args: [updateData, priceIds, publishTimes]
		}) as Hex;

		awaitWalletConfirmation(`Awaiting wallet confirmation to update oracle price..`);
		// 5) Submit
		const hash = await sendTransaction(config, {
			to: pythContractAddress,
			data,
			value: fee
		});

		return transactionSuccess(hash, `Oracle price updated successfully`);
	};

	return {
		subscribe,
		reset,
		handleLockTransaction,
		handleUnlockTransaction,
		handlePythPriceUpdate,
		checkingWalletAllowance,
		awaitWalletConfirmation,
		awaitApprovalTx,
		awaitLockTx,
		awaitUnlockTx,
		transactionSuccess,
		transactionError,
		handleDeployDca
	};
};

export default transactionStore();

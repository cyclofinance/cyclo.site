import { writable } from "svelte/store";
import { TransactionStatus } from "$lib/transactionStore";

type TxError = {
  code: string | null;
  message: string;
  details?: string;
};

type MockTransactionStoreState = {
  status: TransactionStatus;
  error: TxError | string;
  hash: string;
  data: string | null;
  functionName: string;
  message: string;
};

const initialState: MockTransactionStoreState = {
  status: TransactionStatus.IDLE,
  error: "",
  hash: "",
  data: null,
  functionName: "",
  message: "",
};

const mockTransactionWritable =
  writable<MockTransactionStoreState>(initialState);

export const mockTransactionStore = {
  subscribe: mockTransactionWritable.subscribe,
  set: mockTransactionWritable.set,
  reset: () => mockTransactionWritable.set(initialState),

  checkingWalletAllowance: (message: string = "Checking wallet allowance...") =>
    mockTransactionWritable.update((state) => ({
      ...state,
      status: TransactionStatus.CHECKING_ALLOWANCE,
      message,
    })),
  awaitWalletConfirmation: (
    message: string = "Waiting for wallet confirmation...",
  ) =>
    mockTransactionWritable.update((state) => ({
      ...state,
      status: TransactionStatus.PENDING_WALLET,
      message,
    })),
  awaitApprovalTx: (hash: string) =>
    mockTransactionWritable.update((state) => ({
      ...state,
      hash,
      status: TransactionStatus.PENDING_APPROVAL,
    })),
  awaitLockTx: (hash: string) =>
    mockTransactionWritable.update((state) => ({
      ...state,
      hash,
      status: TransactionStatus.PENDING_LOCK,
    })),
  awaitUnlockTx: (hash: string) =>
    mockTransactionWritable.update((state) => ({
      ...state,
      hash,
      status: TransactionStatus.PENDING_UNLOCK,
    })),
  transactionSuccess: (
    hash: string,
    message: string = "Transaction successful!",
  ) =>
    mockTransactionWritable.update((state) => ({
      ...state,
      status: TransactionStatus.SUCCESS,
      hash,
      message,
    })),
  transactionError: (error: string, hash: string = "") =>
    mockTransactionWritable.update((state) => ({
      ...state,
      status: TransactionStatus.ERROR,
      error,
      hash,
    })),

  mockSetSubscribeValue: (value: Partial<MockTransactionStoreState>) =>
    mockTransactionWritable.update((state) => ({
      ...state,
      ...value,
    })),
};

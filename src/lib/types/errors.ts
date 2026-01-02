export enum TransactionErrorMessage {
	USER_REJECTED_APPROVAL = 'The approval transaction was rejected by the user.',
	USER_REJECTED_LOCK = 'The lock transaction was rejected by the user.',
	USER_REJECTED_UNLOCK = 'The unlock transaction was rejected by the user.',
	LOCK_FAILED = 'There was an error in the lock transaction, and it failed to lock your sFLR. Please see the block explorer link for more information.',
	UNLOCK_FAILED = 'There was an error unlocking your sFLR. Please see the block explorer link for more information.',
	APPROVAL_FAILED = 'There was an error in the approval transaction, and it failed to approve the cysFLR spend. Please see the block explorer link for more information.',
	TIMEOUT = 'Transaction timed out... Your transaction may still succeed - please see the block explorer link for more information.',
	BALANCE_REFRESH_FAILED = 'There was an error refreshing your balances. This does not mean that the transaction was unsuccessful. Please see the block explorer link for more information.',
	GENERIC = 'Something went wrong. See the telegram group for support.'
}

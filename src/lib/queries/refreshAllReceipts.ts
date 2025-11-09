import type { Config } from '@wagmi/core';
import type { Receipt } from '$lib/types';
import { myReceipts, tokens } from '$lib/stores';
import { get } from 'svelte/store';
import { getSingleTokenReceipts } from '$lib/queries/getReceipts';

export const refreshAllReceipts = async (
	signerAddress: string,
	config: Config,
	setLoading: (loading: boolean) => void = () => {}
): Promise<Receipt[]> => {
	if (!signerAddress) return [];

	const tokenList = get(tokens);

	const receiptCollections = await Promise.all(
		tokenList.map(async (token) => {
			const receipts = await getSingleTokenReceipts(signerAddress, token.receiptAddress, config);
			return receipts?.map((receipt) => ({ ...receipt, token: token.name })) ?? [];
		})
	);

	const allReceipts = receiptCollections.flat();

	setLoading(false);
	myReceipts.set(allReceipts);
	return allReceipts;
};

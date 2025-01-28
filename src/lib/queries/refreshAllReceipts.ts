import type { Config } from '@wagmi/core';
import type { Receipt } from '$lib/types';
import { myReceipts, tokens } from '$lib/stores';
import { getSingleTokenReceipts } from '$lib/queries/getReceipts';

export const refreshAllReceipts = async (
	signerAddress: string,
	config: Config,
	setLoading: (loading: boolean) => void = () => {}
): Promise<Receipt[]> => {
	if (!signerAddress) return [];
	// Get receipts for both tokens
	const [cysFLRReceipts, cyWETHReceipts] = await Promise.all([
		getSingleTokenReceipts(signerAddress, tokens[0].receiptAddress, config),
		getSingleTokenReceipts(signerAddress, tokens[1].receiptAddress, config)
	]);

	if (!cysFLRReceipts && !cyWETHReceipts) {
		setLoading(false);
		myReceipts.set([]);
		return [];
	}

	// Add token identifier to each receipt
	const allReceipts = [
		...(cysFLRReceipts?.map((r) => ({ ...r, token: 'cysFLR' })) || []),
		...(cyWETHReceipts?.map((r) => ({ ...r, token: 'cyWETH' })) || [])
	];

	setLoading(false);
	myReceipts.set(allReceipts);
	return allReceipts;
};

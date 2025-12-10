import type { Receipt } from '$lib/types';
import { myReceipts, tokens, selectedNetwork } from '$lib/stores';
import { get } from 'svelte/store';
import AccountReceipts from '$lib/queries/account-receipts.graphql?raw';
import type { AccountReceiptsQuery } from '../../generated-graphql';
import { SUBGRAPH_URL } from '$lib/constants';

const PAGE_SIZE = 1000;

type ReceiptBalance = {
	receiptAddress: string;
	balance: string;
	id: string;
	tokenId: string;
};

export const refreshAllReceipts = async (
	signerAddress: string,
	setLoading: (loading: boolean) => void = () => {}
): Promise<Receipt[]> => {
	if (!signerAddress) return [];
	const tokenList = get(tokens);

	if (!tokenList || tokenList.length === 0) {
		setLoading(false);
		myReceipts.set([]);
		return [];
	}

	// Create a map of receiptAddress -> token for quick lookup
	const receiptAddressToToken = new Map<string, typeof tokenList[0]>();
	for (const token of tokenList) {
		receiptAddressToToken.set(token.receiptAddress.toLowerCase(), token);
	}

	const allReceiptBalances: ReceiptBalance[] = [];
	let skip = 0;
	let hasMore = true;

	// Fetch all receipt balances in pages
	while (hasMore) {
		const response = await fetch(SUBGRAPH_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: AccountReceipts,
				variables: {
					account: signerAddress.toLowerCase(),
					first: PAGE_SIZE,
					skip
				}
			})
		});

		const { data, errors } = (await response.json()) as {
			data?: AccountReceiptsQuery;
			errors?: { message: string }[];
		};

		if (errors?.length) {
			console.error('AccountReceipts query errors:', errors);
			break;
		}

		const receiptBalances = data?.account?.receiptBalances;
		if (!receiptBalances || receiptBalances.length === 0) {
			hasMore = false;
			break;
		}

		// Filter receipts that match active tokens by receiptAddress
		const matchingReceipts = receiptBalances
			.filter((receipt) => {
				const receiptAddr = receipt.receiptAddress as string;
				return receiptAddressToToken.has(receiptAddr.toLowerCase());
			})
			.map((receipt) => ({
				receiptAddress: receipt.receiptAddress as string,
				balance: receipt.balance as string,
				id: receipt.id as string,
				tokenId: receipt.tokenId as string
			}));

		allReceiptBalances.push(...matchingReceipts);

		// Continue if we got a full page (might have more)
		if (receiptBalances.length < PAGE_SIZE) {
			hasMore = false;
		} else {
			skip += PAGE_SIZE;
		}
	}

	// Map receipt balances to Receipt format, matching by receiptAddress
	const network = get(selectedNetwork);
	const chainId = network.chain.id.toString();
	
	const receipts: Receipt[] = allReceiptBalances
		.map((receiptBalance): Receipt | null => {
			const token = receiptAddressToToken.get(
				receiptBalance.receiptAddress.toLowerCase()
			);
			if (!token) return null;

			return {
				chainId: chainId,
				tokenAddress: token.receiptAddress,
				tokenId: receiptBalance.tokenId,
				balance: BigInt(receiptBalance.balance),
				token: token.name
			};
		})
		.filter((receipt): receipt is Receipt => receipt !== null);

	setLoading(false);
	myReceipts.set(receipts);
	return receipts;
};
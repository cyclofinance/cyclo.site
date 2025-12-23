import type { Receipt } from '$lib/types';
import { myReceipts, tokens, selectedNetwork } from '$lib/stores';
import { get } from 'svelte/store';
import AccountReceipts from '$lib/queries/account-receipts.graphql?raw';
import type { AccountReceiptsQuery } from '../../generated-graphql';

const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // hard safety guard

type ReceiptBalance = {
	receiptAddress: string;
	balance: string;
	id: string;
	tokenId: string;
};

export const refreshReceiptsForToken = async (
	signerAddress: string,
	selectedTokenName: string,
	setLoading: (loading: boolean) => void = () => {},
	options?: { signal?: AbortSignal }
): Promise<Receipt[]> => {
	if (!signerAddress) return [];

	const tokenList = get(tokens);
	if (!tokenList || tokenList.length === 0) {
		setLoading(false);
		myReceipts.set([]);
		return [];
	}

	const token = tokenList.find((t) => t.name === selectedTokenName);
	if (!token) {
		setLoading(false);
		myReceipts.set([]);
		return [];
	}

	const targetReceiptAddress = token.receiptAddress.toLowerCase();

	const subgraphUrl = get(selectedNetwork).rewardsSubgraphUrl;
	const network = get(selectedNetwork);
	const chainId = network.chain.id.toString();

	const allReceiptBalances: ReceiptBalance[] = [];
	let skip = 0;
	let hasMore = true;
	let pageCount = 0;

	try {
		while (hasMore) {
			pageCount += 1;
			if (pageCount > MAX_PAGES) {
				console.warn(`refreshReceiptsForToken: hit MAX_PAGES (${MAX_PAGES}), stopping to avoid runaway loop.`);
				break;
			}

			// Abort support (prevents racing / runaway requests on fast token changes)
			if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

			const response = await fetch(subgraphUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				signal: options?.signal,
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

			// IMPORTANT: Only keep balances for the selected token receiptAddress
			const matching = receiptBalances
				.filter((rb) => String(rb.receiptAddress).toLowerCase() === targetReceiptAddress)
				.map((rb) => ({
					receiptAddress: rb.receiptAddress as string,
					balance: rb.balance as string,
					id: rb.id as string,
					tokenId: rb.tokenId as string
				}));

			allReceiptBalances.push(...matching);

			if (receiptBalances.length < PAGE_SIZE) {
				hasMore = false;
			} else {
				skip += PAGE_SIZE;
			}
		}
	} catch (e) {
		// Abort should be silent
		if (e instanceof DOMException && e.name === 'AbortError') {
			return [];
		}
		console.error('refreshReceiptsForToken failed:', e);
	} finally {
		setLoading(false);
	}

	const receipts: Receipt[] = allReceiptBalances.map((rb) => ({
		chainId,
		tokenAddress: token.receiptAddress,
		tokenId: rb.tokenId,
		balance: BigInt(rb.balance),
		token: token.name
	}));

	// Store ONLY selected token receipts
	myReceipts.set(receipts);
	return receipts;
};

import type { Receipt, CyToken } from '$lib/types';
import type { NetworkConfig } from '$lib/stores';
import AccountReceipts from '$lib/queries/account-receipts.graphql?raw';
import type { AccountReceiptsQuery } from '../../generated-graphql';

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

/**
 * Every receipt the wallet holds on one network, for every known cyToken, in
 * one pass over the rewards subgraph.
 *
 * Unlike `refreshAllReceipts` this never touches a store and never swallows a
 * failure: a non-OK response or a GraphQL error THROWS. A dead subgraph must
 * surface as an error, because an empty list is indistinguishable from a
 * wallet that genuinely holds nothing.
 *
 * Receipts whose address is not a known cyToken receipt are dropped here, so
 * airdropped scam ERC-1155s never reach the UI.
 */
export const fetchAllReceipts = async (
	signerAddress: string,
	network: NetworkConfig,
	options?: { signal?: AbortSignal }
): Promise<Receipt[]> => {
	if (!signerAddress) return [];

	const byReceiptAddress = new Map<string, CyToken>();
	for (const token of network.tokens) {
		byReceiptAddress.set(token.receiptAddress.toLowerCase(), token);
	}
	if (byReceiptAddress.size === 0) return [];

	const chainId = network.chain.id.toString();
	const receipts: Receipt[] = [];
	let skip = 0;

	for (let page = 0; page < MAX_PAGES; page++) {
		if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

		const response = await fetch(network.rewardsSubgraphUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			signal: options?.signal,
			body: JSON.stringify({
				query: AccountReceipts,
				variables: { account: signerAddress.toLowerCase(), first: PAGE_SIZE, skip }
			})
		});

		if (!response.ok) {
			throw new Error(
				`Rewards subgraph returned ${response.status}. The receipts list cannot be trusted.`
			);
		}

		const { data, errors } = (await response.json()) as {
			data?: AccountReceiptsQuery;
			errors?: { message: string }[];
		};
		if (errors?.length) {
			throw new Error(`AccountReceipts query errors: ${errors.map((e) => e.message).join('; ')}`);
		}

		const balances = data?.account?.receiptBalances ?? [];
		for (const rb of balances) {
			const token = byReceiptAddress.get(String(rb.receiptAddress).toLowerCase());
			if (!token) continue;
			receipts.push({
				chainId,
				tokenAddress: token.receiptAddress,
				tokenId: String(rb.tokenId),
				balance: BigInt(String(rb.balance)),
				token: token.name
			});
		}

		if (balances.length < PAGE_SIZE) break;
		skip += PAGE_SIZE;
	}

	return receipts;
};

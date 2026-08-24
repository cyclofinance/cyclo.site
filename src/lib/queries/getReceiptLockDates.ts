import type { NetworkConfig } from '$lib/stores';
import { isFlareNetwork } from '$lib/stores';

/**
 * Lock dates for ERC-1155 receipts, read from the explorer's token-transfer feed.
 *
 * The subgraph carries no per-receipt timestamp (ReceiptOwnerBalance is
 * balance/id/owner/receipt/receiptAddress/tokenId only), so the mint event is
 * the only source for "when was this locked". A mint is a transfer from 0x0.
 *
 * SECURITY: every field on this response except the four read below is
 * attacker-controlled. `total.token_instance.metadata` in particular carries a
 * `name`/`description`/`image` written by whoever deployed the token, and
 * wallets on this chain receive airdropped ERC-1155s whose metadata is a
 * phishing lure. We filter to the known receipt address first and never read,
 * return, or render metadata, names, or image/animation URLs.
 */

const MAX_PAGES = 20; // ~1000 transfers; hard guard against a runaway feed
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type TokenTransfer = {
	from?: { hash?: string };
	timestamp?: string;
	total?: { token_id?: string };
	token?: { address_hash?: string };
};

/** tokenId (decimal string) -> epoch ms of the earliest mint we saw for it. */
export type LockDateMap = Map<string, number>;

export const getReceiptLockDates = async (
	walletAddress: string,
	receiptAddress: string,
	networkConfig: NetworkConfig,
	options?: { signal?: AbortSignal }
): Promise<LockDateMap> => {
	const lockDates: LockDateMap = new Map();
	if (!walletAddress || !receiptAddress) return lockDates;

	// Blockscout-only. Arbitrum's explorerApiUrl points at Etherscan v2, which
	// has no /v2/addresses/{a}/token-transfers route — bail rather than 404.
	if (!isFlareNetwork(networkConfig)) return lockDates;

	const wanted = receiptAddress.toLowerCase();
	const base = `${networkConfig.explorerApiUrl}/v2/addresses/${walletAddress}/token-transfers`;
	let params = new URLSearchParams({ type: 'ERC-1155', token: receiptAddress });

	try {
		for (let page = 0; page < MAX_PAGES; page++) {
			if (options?.signal?.aborted) return lockDates;

			const response = await fetch(`${base}?${params.toString()}`, { signal: options?.signal });
			if (!response.ok) {
				console.error(`getReceiptLockDates: explorer returned ${response.status}`);
				return lockDates;
			}

			const body = (await response.json()) as {
				items?: TokenTransfer[];
				next_page_params?: Record<string, string | number> | null;
			};

			for (const item of body.items ?? []) {
				// Defence in depth: the `token=` filter is server-side, re-check it here.
				if (item.token?.address_hash?.toLowerCase() !== wanted) continue;
				// Mints only — a transfer in from another wallet is not a lock.
				if (item.from?.hash?.toLowerCase() !== ZERO_ADDRESS) continue;

				const tokenId = item.total?.token_id;
				const timestamp = item.timestamp;
				if (!tokenId || !timestamp) continue;

				const ms = Date.parse(timestamp);
				if (Number.isNaN(ms)) continue;

				// A tokenId can be minted more than once (same lock price, later
				// deposit). The earliest mint is when the position was opened.
				const existing = lockDates.get(tokenId);
				if (existing === undefined || ms < existing) lockDates.set(tokenId, ms);
			}

			const next = body.next_page_params;
			if (!next || Object.keys(next).length === 0) break;

			params = new URLSearchParams({ type: 'ERC-1155', token: receiptAddress });
			for (const [key, value] of Object.entries(next)) {
				if (value !== null && value !== undefined) params.append(key, String(value));
			}
		}
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') return lockDates;
		console.error('getReceiptLockDates failed:', e);
	}

	return lockDates;
};

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getReceiptLockDates, getReceiptLockInfo } from './getReceiptLockDates';
import type { NetworkConfig } from '$lib/stores';
import { flare, arbitrum } from '@wagmi/core/chains';

const RECEIPT = '0xd387fc43e19a63036d8fced559e81f5ddef7ef09';
const WALLET = '0xc36171cb5cbcbc41b32b354ada2e1077eb47d56e';
const ZERO = '0x0000000000000000000000000000000000000000';

const flareNetwork = {
	chain: flare,
	explorerApiUrl: 'https://flare-explorer.flare.network/api'
} as unknown as NetworkConfig;

const arbitrumNetwork = {
	chain: arbitrum,
	explorerApiUrl: 'https://api.etherscan.io/v2/api'
} as unknown as NetworkConfig;

const transfer = (over: Record<string, unknown> = {}) => ({
	from: { hash: ZERO },
	to: { hash: WALLET },
	timestamp: '2025-12-03T22:51:34.000000Z',
	total: { token_id: '23677170395729291' },
	token: { address_hash: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' },
	...over
});

const mockFetchOnce = (body: unknown, ok = true, status = 200) =>
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status, json: async () => body }));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('getReceiptLockDates', () => {
	it('maps a mint to its tokenId lock date', async () => {
		mockFetchOnce({ items: [transfer()], next_page_params: null });
		const dates = await getReceiptLockDates(WALLET, RECEIPT, flareNetwork);
		expect(dates.get('23677170395729291')).toBe(Date.parse('2025-12-03T22:51:34.000000Z'));
	});

	it('ignores transfers in from another wallet — only a mint is a lock', async () => {
		mockFetchOnce({
			items: [transfer({ from: { hash: '0x1111111111111111111111111111111111111111' } })],
			next_page_params: null
		});
		const dates = await getReceiptLockDates(WALLET, RECEIPT, flareNetwork);
		expect(dates.size).toBe(0);
	});

	it('drops an airdropped ERC-1155 from a different contract and never reads its metadata', async () => {
		// Shape of a real scam airdrop seen on this chain: correct-looking transfer,
		// wrong token address, phishing text in the metadata.
		const scam = transfer({
			token: { address_hash: '0xbadbadbadbadbadbadbadbadbadbadbadbadbad0' },
			total: {
				token_id: '999',
				token_instance: {
					metadata: {
						name: '#🚨Wallet Alert',
						description: 'Visit flare․help and connect your wallet to claim.'
					}
				}
			}
		});
		mockFetchOnce({ items: [scam, transfer()], next_page_params: null });

		const dates = await getReceiptLockDates(WALLET, RECEIPT, flareNetwork);
		expect(dates.has('999')).toBe(false);
		expect(dates.size).toBe(1);
		// Nothing returned carries attacker-controlled text.
		expect(JSON.stringify([...dates])).not.toContain('flare');
	});

	it('keeps the earliest mint when a tokenId is minted more than once', async () => {
		mockFetchOnce({
			items: [
				transfer({ timestamp: '2026-03-01T00:00:00.000000Z' }),
				transfer({ timestamp: '2025-01-01T00:00:00.000000Z' })
			],
			next_page_params: null
		});
		const dates = await getReceiptLockDates(WALLET, RECEIPT, flareNetwork);
		expect(dates.get('23677170395729291')).toBe(Date.parse('2025-01-01T00:00:00.000000Z'));
	});

	it('returns empty on a non-Flare network instead of calling Etherscan', async () => {
		const spy = vi.fn();
		vi.stubGlobal('fetch', spy);
		const dates = await getReceiptLockDates(WALLET, RECEIPT, arbitrumNetwork);
		expect(dates.size).toBe(0);
		expect(spy).not.toHaveBeenCalled();
	});

	it('returns empty rather than throwing when the explorer errors', async () => {
		mockFetchOnce({}, false, 503);
		const dates = await getReceiptLockDates(WALLET, RECEIPT, flareNetwork);
		expect(dates.size).toBe(0);
	});
});

describe('getReceiptLockInfo', () => {
	it('carries the mint block through, and keeps the EARLIEST mint per tokenId', async () => {
		mockFetchOnce({
			items: [
				transfer({ timestamp: '2026-01-20T06:32:56.000000Z', block_number: 54138410 }),
				transfer({ timestamp: '2025-12-03T22:51:34.000000Z', block_number: 51000000 })
			],
			next_page_params: null
		});
		const info = await getReceiptLockInfo(WALLET, RECEIPT, flareNetwork);
		expect(info.get('23677170395729291')).toEqual({
			lockedAtMs: Date.parse('2025-12-03T22:51:34.000000Z'),
			blockNumber: 51000000
		});
	});

	it('records a null block when the feed omits it, rather than inventing one', async () => {
		mockFetchOnce({ items: [transfer()], next_page_params: null });
		const info = await getReceiptLockInfo(WALLET, RECEIPT, flareNetwork);
		expect(info.get('23677170395729291')?.blockNumber).toBeNull();
	});
});

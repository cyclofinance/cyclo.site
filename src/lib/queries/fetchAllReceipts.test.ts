import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAllReceipts } from './fetchAllReceipts';
import type { NetworkConfig } from '$lib/stores';

vi.mock('$lib/queries/account-receipts.graphql?raw', () => ({ default: 'query {}' }));

const network = {
	key: 'flare',
	chain: { id: 14 },
	rewardsSubgraphUrl: 'https://subgraph.test/gn',
	tokens: [
		{ name: 'cysFLR', receiptAddress: '0xAAAA' },
		{ name: 'cyWETH', receiptAddress: '0xBBBB' }
	]
} as unknown as NetworkConfig;

const jsonResponse = (body: unknown, status = 200) =>
	({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('fetchAllReceipts', () => {
	it('returns receipts for every known token and drops unknown (scam) receipt addresses', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				jsonResponse({
					data: {
						account: {
							receiptBalances: [
								{ receiptAddress: '0xaaaa', balance: '100', tokenId: '5', id: '1' },
								{ receiptAddress: '0xbbbb', balance: '7', tokenId: '9', id: '2' },
								{ receiptAddress: '0xdead', balance: '1', tokenId: '1', id: '3' }
							]
						}
					}
				})
			)
		);
		const receipts = await fetchAllReceipts('0xWallet', network);
		expect(receipts.map((r) => r.token)).toEqual(['cysFLR', 'cyWETH']);
		expect(receipts[0]).toMatchObject({ balance: 100n, tokenId: '5', chainId: '14' });
	});

	it('THROWS on a non-OK subgraph response instead of returning an empty list', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ message: 'not found' }, 404))
		);
		await expect(fetchAllReceipts('0xWallet', network)).rejects.toThrow(/404/);
	});

	it('THROWS on GraphQL errors', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ errors: [{ message: 'indexing error' }] }))
		);
		await expect(fetchAllReceipts('0xWallet', network)).rejects.toThrow(/indexing error/);
	});

	it('pages until a short page', async () => {
		const full = Array.from({ length: 1000 }, (_, i) => ({
			receiptAddress: '0xaaaa',
			balance: '1',
			tokenId: String(i),
			id: String(i)
		}));
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ data: { account: { receiptBalances: full } } }))
			.mockResolvedValueOnce(
				jsonResponse({
					data: {
						account: {
							receiptBalances: [{ receiptAddress: '0xaaaa', balance: '1', tokenId: 'x', id: 'x' }]
						}
					}
				})
			);
		vi.stubGlobal('fetch', fetchMock);
		const receipts = await fetchAllReceipts('0xWallet', network);
		expect(receipts).toHaveLength(1001);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
		expect(secondBody.variables.skip).toBe(1000);
	});

	it('returns [] without a network call when no wallet is given', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		expect(await fetchAllReceipts('', network)).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

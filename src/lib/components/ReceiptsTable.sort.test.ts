import { render, screen } from '@testing-library/svelte';
import ReceiptsTable from './ReceiptsTable.svelte';
import { describe, it, expect } from 'vitest';
import { mockReceipt } from '$lib/mocks/mockReceipt';
import type { CyToken, Receipt } from '$lib/types';

// Three DISTINCT lock prices, deliberately supplied out of order.
// Mirrors the live screenshot: 1.80599, 1.90789, 1.38515
const unsorted = [
	{ ...mockReceipt, tokenId: '1805990000000000000' },
	{ ...mockReceipt, tokenId: '1907890000000000000' },
	{ ...mockReceipt, tokenId: '1385150000000000000' }
];

describe('ReceiptsTable sorting (patch under test)', () => {
	const selectedToken: CyToken = {
		name: 'cysFLR',
		address: '0xcdef1234abcdef5678',
		underlyingAddress: '0xabcd1234',
		underlyingSymbol: 'sFLR',
		receiptAddress: '0xeeff5678',
		symbol: 'cysFLR',
		decimals: 18,
		chainId: 14,
		networkName: 'Flare',
		active: true
	};

	it('renders receipts ascending by lock price regardless of input order', () => {
		render(ReceiptsTable, { receipts: unsorted as unknown as Receipt[], token: selectedToken });

		const rendered = [0, 1, 2].map((i) =>
			Number(screen.getByTestId(`locked-price-${i}`).textContent!.trim())
		);

		expect(rendered).toEqual(['1.38515', '1.80599', '1.90789'].map(Number));
	});
});

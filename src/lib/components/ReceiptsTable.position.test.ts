import { render, screen } from '@testing-library/svelte';
import ReceiptsTable from './ReceiptsTable.svelte';
import { describe, it, expect } from 'vitest';
import type { CyToken, Receipt } from '$lib/types';

const token: CyToken = {
	name: 'cysFLR',
	symbol: 'cysFLR',
	decimals: 18,
	address: '0x19831cfb53a0dbead9866c43557c1d48dff76567',
	underlyingAddress: '0x12e605bc104e93b45e1ad99f9e555f659051c2bb',
	underlyingSymbol: 'sFLR',
	receiptAddress: '0xd387fc43e19a63036d8fced559e81f5ddef7ef09',
	chainId: 14,
	networkName: 'Flare',
	active: true
};

// One real cysFLR position: 1 cysFLR locked at $0.023677170395729291 per sFLR.
const receipts = [
	{ tokenId: '23677170395729291', balance: 10n ** 18n, tokenAddress: token.receiptAddress, chainId: '14' }
] as unknown as Receipt[];

const SFLR_NOW = 13_955_969_173_365_373n; // $0.013956 — down since lock
const CYSFLR_NOW = 112_454_000_000_000_000n; // $0.112454 — deep discount to $1 nominal

describe('ReceiptsTable position columns', () => {
	it('omits the new columns entirely when no lock dates or prices are supplied', () => {
		render(ReceiptsTable, { receipts, token });
		expect(screen.queryByTestId('days-held-0')).toBeNull();
		expect(screen.queryByTestId('collateral-pnl-0')).toBeNull();
		expect(screen.queryByTestId('net-to-close-0')).toBeNull();
	});

	it('renders days held from the lock date', () => {
		const tenDaysAgo = Date.now() - 10 * 86_400_000;
		render(ReceiptsTable, {
			receipts,
			token,
			lockDates: new Map([['23677170395729291', tenDaysAgo]])
		});
		expect(screen.getByTestId('days-held-0')).toHaveTextContent('10d');
	});

	it('shows a dash for a receipt with no lock date rather than claiming zero days', () => {
		render(ReceiptsTable, {
			receipts,
			token,
			lockDates: new Map([['some-other-token-id', Date.now()]])
		});
		expect(screen.getByTestId('days-held-0')).toHaveTextContent('—');
	});

	it('renders both P&L legs and a net-to-close with the right signs', () => {
		render(ReceiptsTable, {
			receipts,
			token,
			underlyingUsdNow: SFLR_NOW,
			cyTokenUsdNow: CYSFLR_NOW
		});
		// sFLR fell since lock -> collateral leg negative.
		expect(screen.getByTestId('collateral-pnl-0')).toHaveTextContent('−$0.4106');
		// cysFLR trades at $0.112 against $1 nominal -> repayment leg positive.
		expect(screen.getByTestId('cytoken-pnl-0')).toHaveTextContent('+$0.8875');
		// Net = 0.8875 - 0.4106 = +0.4770
		expect(screen.getByTestId('net-to-close-0')).toHaveTextContent('+$0.4770');
	});

	it('renders the cyToken leg as unavailable when there is no live pool', () => {
		render(ReceiptsTable, { receipts, token, underlyingUsdNow: SFLR_NOW, cyTokenUsdNow: null });
		expect(screen.getByTestId('collateral-pnl-0')).toHaveTextContent('−$0.4106');
		expect(screen.getByTestId('cytoken-pnl-0')).toHaveTextContent('—');
		expect(screen.getByTestId('net-to-close-0')).toHaveTextContent('—');
		expect(screen.getByTestId('cytoken-price-unavailable')).toBeInTheDocument();
	});

	it('totals the columns across positions', () => {
		const two = [
			receipts[0],
			{ tokenId: '23677170395729291', balance: 10n ** 18n, tokenAddress: token.receiptAddress, chainId: '14' }
		] as unknown as Receipt[];
		render(ReceiptsTable, {
			receipts: two,
			token,
			underlyingUsdNow: SFLR_NOW,
			cyTokenUsdNow: CYSFLR_NOW
		});
		expect(screen.getByTestId('total-collateral-pnl')).toHaveTextContent('−$0.8211');
		expect(screen.getByTestId('total-net-to-close')).toHaveTextContent('+$0.9539');
	});
});

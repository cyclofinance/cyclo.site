import { render, screen, waitFor } from '@testing-library/svelte';
import Footer from './Footer.svelte';
import { describe, it, vi, expect, beforeEach } from 'vitest';

const { mockBalancesStore } = await vi.hoisted(() => import('$lib/mocks/mockStores'));

vi.mock('ethers', async () => {
	return {
		formatEther: vi.fn().mockImplementation((value) => value.toString()),
		formatUnits: vi.fn().mockImplementation((value) => value.toString())
	};
});

vi.mock('$lib/balancesStore', async () => {
	return {
		default: mockBalancesStore
	};
});

describe('Footer.svelte', () => {
	beforeEach(() => {
		mockBalancesStore.mockSetSubscribeValue(
			'Ready',
			false,
			{
				cyWETH: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(3000)
				},
				cysFLR: {
					lockPrice: BigInt(1e18),
					price: BigInt(0),
					supply: BigInt(1e18),
					underlyingTvl: BigInt(3000),
					usdTvl: BigInt(3000)
				},
				cyFXRP: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				}
			},
			{
				cyWETH: {
					signerBalance: BigInt(200),
					signerUnderlyingBalance: BigInt(200)
				},
				cysFLR: {
					signerBalance: BigInt(100),
					signerUnderlyingBalance: BigInt(100)
				},
				cyFXRP: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				}
			},
			{
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		);
	});

	it('should display cysFLR supply correctly', async () => {
		render(Footer);

		await waitFor(() => {
			expect(screen.getByTestId('supply')).toBeInTheDocument();
		});
	});

	it('should display TVL correctly', async () => {
		render(Footer);

		await waitFor(() => {
			expect(screen.getByTestId('tvl')).toBeInTheDocument();
			expect(screen.getByText('3000 sFLR / $ 3000')).toBeInTheDocument();
		});
	});

	it('should not display supply if fetch fails', async () => {
		mockBalancesStore.mockSetSubscribeValue(
			'Ready',
			false,
			{
				cyWETH: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				},
				cysFLR: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				},
				cyFXRP: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				}
			},
			{
				cyWETH: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				},
				cysFLR: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				},
				cyFXRP: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				}
			},
			{
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		);

		render(Footer);

		await waitFor(() => {
			expect(screen.queryByText('Total cysFLR supply')).not.toBeInTheDocument();
			expect(screen.queryByText('Total TVL')).not.toBeInTheDocument();
		});
	});

	it('should display market cap correctly', async () => {
		mockBalancesStore.mockSetSubscribeValue(
			'Ready',
			false,
			{
				cyWETH: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				},
				cysFLR: {
					lockPrice: BigInt(0),
					price: BigInt(1e18),
					supply: BigInt(1),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				},
				cyFXRP: {
					lockPrice: BigInt(0),
					price: BigInt(0),
					supply: BigInt(0),
					underlyingTvl: BigInt(0),
					usdTvl: BigInt(0)
				}
			},
			{
				cyWETH: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				},
				cysFLR: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				},
				cyFXRP: {
					signerBalance: BigInt(0),
					signerUnderlyingBalance: BigInt(0)
				}
			},
			{
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		);
		render(Footer);

		await waitFor(() => {
			expect(screen.getByTestId('market-cap-cysFLR')).toBeInTheDocument();
			expect(screen.getByText('$ 1000000000000')).toBeInTheDocument();
		});
	});
});

import { render, screen, waitFor } from '@testing-library/svelte';
import Lock from './Lock.svelte';
import transactionStore from '$lib/transactionStore';
import userEvent from '@testing-library/user-event';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { mockSignerAddressStore } from '$lib/mocks/mockStores';
import { parseEther } from 'ethers';

const { mockBalancesStore } = await vi.hoisted(() => import('$lib/mocks/mockStores'));

vi.mock('../../generated', async (importOriginal) => {
	return {
		...((await importOriginal()) as object),
		simulateErc20PriceOracleReceiptVaultPreviewDeposit: vi.fn(async () => ({
			result: 14920000000000000n
		}))
	};
});

vi.mock('$lib/balancesStore', async () => {
	return {
		default: {
			...mockBalancesStore,
			refreshSwapQuote: vi.fn(),
			refreshBalances: vi.fn(),
			refreshPrices: vi.fn(),
			refreshDepositPreviewSwapValue: vi.fn()
		}
	};
});

vi.mock('$lib/transactionStore', async (importOriginal) => ({
	default: {
		...((await importOriginal) as object),
		handleLockTransaction: vi.fn().mockResolvedValue({})
	}
}));

describe('Lock Component', () => {
	const initiateLockTransactionSpy = vi.spyOn(transactionStore, 'handleLockTransaction');

	beforeEach(() => {
		initiateLockTransactionSpy.mockClear();
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
					lockPrice: BigInt(1),
					price: BigInt(1234000000000000000n),
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
					signerBalance: BigInt(9876000000000000000n),
					signerUnderlyingBalance: BigInt(9876000000000000000n)
				}
			},
			{
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		);
	});

	it('should render sFLR balance and price ratio correctly', async () => {
		mockSignerAddressStore.mockSetSubscribeValue('0x1234567890123456789012345678901234567890');
		render(Lock);
		await waitFor(() => {
			expect(screen.getByTestId('underlying-balance')).toBeInTheDocument();

			expect(screen.getByTestId('underlying-balance')).toHaveTextContent('9.876');
			expect(screen.getByTestId('price-ratio')).toBeInTheDocument();
		});
	});

	it('should calculate the correct cysFLR amount based on input', async () => {
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
					lockPrice: BigInt(parseEther('1')),
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
				}
			},
			{
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(1234e18)
			}
		);
		render(Lock);

		const input = screen.getByTestId('lock-input');
		await userEvent.type(input, '0.5');

		await waitFor(() => {
			const priceRatio = screen.getByTestId('price-ratio');
			expect(priceRatio).toBeInTheDocument();
			const calculatedCysflr = screen.getByTestId('calculated-cysflr');
			expect(calculatedCysflr).toHaveTextContent('1234.0');
		});
	});

	it('should call handleLockTransaction when lock button is clicked', async () => {
		render(Lock);

		const input = screen.getByTestId('lock-input');
		await userEvent.type(input, '0.0005');

		const lockButton = screen.getByTestId('lock-button');
		await userEvent.click(lockButton);

		await waitFor(() => {
			expect(screen.getByTestId('disclaimer-modal')).toBeInTheDocument();
		});
	});

	it('should disable the lock button if SFLR balance is insufficient', async () => {
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
					lockPrice: BigInt(1),
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
				}
			},
			{
				cusdxOutput: BigInt(0),
				cyTokenOutput: BigInt(0)
			}
		);
		render(Lock);
		const input = screen.getByTestId('lock-input');
		await userEvent.type(input, '500000');
		const lockButton = screen.getByTestId('lock-button');
		expect(lockButton).toBeDisabled();
		expect(lockButton).toHaveTextContent('INSUFFICIENT sFLR');
	});
	//
	// it('should disable the lock button if no value had been entered', async () => {
	// 	mockBalancesStore.mockSetSubscribeValue(
	// 		BigInt(0),
	// 		BigInt(0),
	// 		'Ready',
	// 		BigInt(1),
	// 		BigInt(0),
	// 		BigInt(0),
	// 		BigInt(0),
	// 		BigInt(0),
	// 		BigInt(0),
	// 		{ cysFlrOutput: BigInt(0), cusdxOutput: BigInt(0) } // swapQuotes
	// 	);
	// 	render(Lock);
	// 	const lockButton = screen.getByTestId('lock-button');
	// 	expect(lockButton).toBeDisabled();
	// 	expect(lockButton).toHaveTextContent('LOCK');
	// });
	//
	// it('should show the connect message if there is no signerAddress', async () => {
	// 	mockSignerAddressStore.mockSetSubscribeValue('');
	// 	render(Lock);
	// 	await waitFor(() => {
	// 		expect(screen.getByTestId('connect-message')).toBeInTheDocument();
	// 	});
	// });
	//
	// it('should show the sFLR balance if there is a signerAddress', async () => {
	// 	mockSignerAddressStore.mockSetSubscribeValue('0x0000');
	// 	render(Lock);
	// 	await waitFor(() => {
	// 		const balance = screen.getByTestId('your-balance');
	// 		expect(balance).toBeInTheDocument();
	// 		expect(balance).toHaveTextContent('9.876');
	// 	});
	// });
	//
	// it('should display correct USD value', async () => {
	// 	mockBalancesStore.mockSetSubscribeValue(
	// 		BigInt('1000000000000000000'), // sFlrBalance (1 sFLR)
	// 		BigInt('1000000000000000000'), // cysFlrBalance (1 cysFLR)
	// 		'Ready',
	// 		BigInt('1000000000000000000'), // lockPrice (1 USD, 18 decimals)
	// 		BigInt('2000000'), // cysFlrUsdPrice (2 USD, 6 decimals)
	// 		BigInt('1000000'), // sFlrUsdPrice (1 USD, 6 decimals)
	// 		BigInt('1000000000000000000'), // cysFlrSupply
	// 		BigInt('1000000000000000000'), // TVLsFlr
	// 		BigInt('1000000000000000000'), // TVLUsd
	// 		{ cysFlrOutput: BigInt(0), cusdxOutput: BigInt('3000000000000000000') } // swapQuotes
	// 	);
	//
	// 	render(Lock);
	//
	// 	const input = screen.getByTestId('lock-input');
	// 	await userEvent.type(input, '500000');
	//
	// 	await waitFor(() => {
	// 		const usdValueElement = screen.getByTestId('calculated-cysflr-usd');
	// 		expect(usdValueElement).toHaveTextContent('Current market value ~$ 3000000000000.0');
	// 	});
	// });
	//
	// it('should activate lock transaction when the disclaimer is accepted', async () => {
	// 	render(Lock);
	//
	// 	const input = screen.getByTestId('lock-input');
	// 	await userEvent.type(input, '0.0005');
	//
	// 	const lockButton = screen.getByTestId('lock-button');
	// 	await userEvent.click(lockButton);
	//
	// 	await waitFor(() => {
	// 		expect(screen.getByTestId('disclaimer-modal')).toBeInTheDocument();
	// 	});
	//
	// 	screen.debug();
	//
	// 	const acceptButton = screen.getByTestId('disclaimer-acknowledge-button');
	// 	await userEvent.click(acceptButton);
	// 	expect(initiateLockTransactionSpy).toHaveBeenCalled();
	// });
});

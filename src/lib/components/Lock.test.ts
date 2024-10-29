import { render, screen, waitFor } from '@testing-library/svelte';
import Lock from './Lock.svelte';
import transactionStore from '$lib/transactionStore';
import userEvent from '@testing-library/user-event';
import { vi, describe, beforeEach, it, expect } from 'vitest';

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
    default: mockBalancesStore
  };
});


vi.mock('$lib/transactionStore', async (importOriginal) => ({
  default: {
    ...((await importOriginal) as object),
    initiateLockTransaction: vi.fn().mockResolvedValue({})
  }
}));

describe('Lock Component', () => {
  const initiateLockTransactionSpy = vi.spyOn(transactionStore, 'initiateLockTransaction');

  beforeEach(() => {
    initiateLockTransactionSpy.mockClear();
    mockBalancesStore.mockSetSubscribeValue(
      BigInt(1000000000000000000), // sFlrBalance
      BigInt(1000000000000000000), // wFlrBalance
      'Ready' // status
    );
  });

  it('should render SFLR balance and price ratio correctly', async () => {
    render(Lock);
    await waitFor(() => {
      expect(screen.getByTestId('sflr-balance')).toHaveTextContent('1.0000');
      expect(screen.getByTestId('price-ratio')).toBeInTheDocument();
    });
  });

  it('should calculate the correct cysFLR amount based on input', async () => {
    render(Lock);

    const input = screen.getByTestId('lock-input');
    await userEvent.type(input, '0.5');

    await waitFor(() => {
      const priceRatio = screen.getByTestId('price-ratio');
      expect(priceRatio).toBeInTheDocument();
      const calculatedCyflr = screen.getByTestId('calculated-cyflr');
      expect(calculatedCyflr).toHaveTextContent('0.500');
    });
  });

  it('should call initiateLockTransaction when lock button is clicked', async () => {
    render(Lock);

    const input = screen.getByTestId('lock-input');
    await userEvent.type(input, '0.5');

    const lockButton = screen.getByTestId('lock-button');
    await userEvent.click(lockButton);

    await waitFor(() => {
      expect(initiateLockTransactionSpy).toHaveBeenCalled();
    });
  });

  it('should disable the lock button if SFLR balance is insufficient', async () => {
    mockBalancesStore.mockSetSubscribeValue(BigInt(0), BigInt(0), 'Ready');
    render(Lock);

    const lockButton = screen.getByTestId('lock-button');
    expect(lockButton).toBeDisabled();
  });

  it('should handle errors when fetching price ratio', async () => {
    const { simulateErc20PriceOracleReceiptVaultPreviewDeposit } = await import('../../generated');
    vi.mocked(simulateErc20PriceOracleReceiptVaultPreviewDeposit).mockRejectedValue(new Error('Failed to fetch price ratio'));

    render(Lock);

    await waitFor(() => {
      expect(screen.getByTestId('price-ratio')).toHaveTextContent('0.00000');
    });
  });
});
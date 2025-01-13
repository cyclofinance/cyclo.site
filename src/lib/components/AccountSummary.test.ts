import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import AccountSummary from './AccountSummary.svelte';

vi.mock('$lib/queries/fetchAccountStatus', () => ({
	fetchAccountStatus: vi.fn()
}));

describe('AccountSummary Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show loading state while fetching AccountSummary', async () => {
		const { fetchAccountStatus } = await import('$lib/queries/fetchAccountStatus');
		vi.mocked(fetchAccountStatus).mockImplementation(() => new Promise(() => {}));

		render(AccountSummary);

		await waitFor(() => {
			expect(screen.getByTestId('loader')).toBeInTheDocument();
		});
	});
});

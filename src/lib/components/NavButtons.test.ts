import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import NavButtons from './NavButtons.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('NavButtons Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should display Buttons', async () => {
		render(NavButtons);

		await waitFor(() => {
			expect(screen.getByTestId('docs-button')).toBeInTheDocument();
			expect(screen.getByTestId('docs-button-mobile')).toBeInTheDocument();
			expect(screen.getByTestId('rewards-button')).toBeInTheDocument();
			expect(screen.getByTestId('rewards-button-mobile')).toBeInTheDocument();
		});
	});
});

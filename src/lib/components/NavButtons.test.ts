import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import NavButtons from './NavButtons.svelte';
import { goto } from '$app/navigation';
import { base } from '$app/paths';

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

	it('should check app button is displayed and navigates to correct url', async () => {
		const { getByTestId } = render(NavButtons, {
			props: { launched: true }
		});

		await waitFor(async () => {
			expect(screen.getByTestId('app-button')).toBeInTheDocument();

			const button = getByTestId('app-button');
			await fireEvent.click(button);

			expect(goto).toHaveBeenCalledWith(base + '/lock');
		});
	});

	it('should check app button is not displayed', async () => {
		render(NavButtons, {
			props: { launched: false }
		});

		await waitFor(async () => {
			expect(screen.queryByText('App')).not.toBeInTheDocument();
		});
	});

	it('should check ', async () => {
		const { getByTestId } = render(NavButtons, {
			props: { launched: true }
		});

		await waitFor(async () => {
			const docsButton = getByTestId('docs-button');
			await fireEvent.click(docsButton);

			expect(goto).toHaveBeenCalledWith(base + '/docs');

			const rewardsButton = getByTestId('rewards-button');
			await fireEvent.click(rewardsButton);

			expect(goto).toHaveBeenCalledWith(base + '/rewards');
		});
	});
});

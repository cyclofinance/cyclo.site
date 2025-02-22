import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import NavButtons from './NavButtons.svelte';
import { base } from '$app/paths';

describe('NavButtons Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should display Buttons', async () => {
		render(NavButtons, {
			props: { launched: true }
		});

		await waitFor(() => {
			expect(screen.getByTestId('docs-button')).toBeInTheDocument();
			expect(screen.getByTestId('docs-button-mobile')).toBeInTheDocument();
			expect(screen.getByTestId('rewards-button')).toBeInTheDocument();
			expect(screen.getByTestId('rewards-button-mobile')).toBeInTheDocument();
		});
	});

	it('should check app button is displayed and has correct href', async () => {
		const { getByTestId } = render(NavButtons, {
			props: { launched: true }
		});

		const button = getByTestId('app-button');
		expect(button).toHaveAttribute('href', base + '/lock');
	});

	it('should check app button is not displayed', async () => {
		render(NavButtons, {
			props: { launched: false }
		});

		await waitFor(async () => {
			expect(screen.queryByText('App')).not.toBeInTheDocument();
		});
	});

	it('should check navigation links have correct hrefs', async () => {
		const { getByTestId } = render(NavButtons, {
			props: { launched: true }
		});

		const docsButton = getByTestId('docs-button');
		expect(docsButton).toHaveAttribute('href', base + '/docs');

		const rewardsButton = getByTestId('rewards-button');
		expect(rewardsButton).toHaveAttribute('href', base + '/rewards');
	});
});

import { render, screen, waitFor } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import NavButtons from './NavButtons.svelte';
import { base } from '$app/paths';
import userEvent from '@testing-library/user-event';

describe('NavButtons Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should display Buttons', async () => {
		render(NavButtons, {
			props: { launched: true }
		});

		// Desktop buttons
		await waitFor(() => {
			expect(screen.getByTestId('docs-button')).toBeInTheDocument();
			expect(screen.getByTestId('rewards-button')).toBeInTheDocument();
		});

		// Open mobile menu
		const hamburger = screen.getByTestId('nav-hamburger');
		await userEvent.click(hamburger);

		// Mobile buttons (now visible)
		await waitFor(() => {
			expect(screen.getByTestId('docs-button-mobile')).toBeInTheDocument();
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

	it('should show hamburger icon on mobile', () => {
		render(NavButtons, { props: { launched: true } });
		expect(screen.getByTestId('nav-hamburger')).toBeInTheDocument();
	});

	it('should open mobile menu when hamburger is clicked', async () => {
		render(NavButtons, { props: { launched: true } });
		const hamburger = screen.getByTestId('nav-hamburger');
		await userEvent.click(hamburger);
		expect(screen.getByTestId('docs-button-mobile')).toBeInTheDocument();
		expect(screen.getByTestId('rewards-button-mobile')).toBeInTheDocument();
	});

	it('should close mobile menu when a link is clicked', async () => {
		render(NavButtons, { props: { launched: true } });
		const hamburger = screen.getByTestId('nav-hamburger');
		await userEvent.click(hamburger);

		const docsLink = screen.getByTestId('docs-button-mobile');
		await userEvent.click(docsLink);

		await waitFor(() => {
			expect(screen.queryByTestId('docs-button-mobile')).not.toBeInTheDocument();
		});
	});
});

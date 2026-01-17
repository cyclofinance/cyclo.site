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

		const tradeButton = getByTestId('trade-button');
		expect(tradeButton).toHaveAttribute('href', base + '/trade');

		const chartButton = getByTestId('chart-button');
		expect(chartButton).toHaveAttribute('href', base + '/chart');
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

	it('should display chart button in mobile menu', async () => {
		render(NavButtons, { props: { launched: true } });

		// Open mobile menu
		const hamburger = screen.getByTestId('nav-hamburger');
		await userEvent.click(hamburger);

		// Check chart button is visible
		await waitFor(() => {
			expect(screen.getByTestId('chart-button-mobile')).toBeInTheDocument();
		});
	});

	it('should display chart button in desktop navigation', () => {
		render(NavButtons, { props: { launched: true } });
		expect(screen.getByTestId('chart-button')).toBeInTheDocument();
	});

	it('should close mobile menu when chart link is clicked', async () => {
		render(NavButtons, { props: { launched: true } });
		const hamburger = screen.getByTestId('nav-hamburger');
		await userEvent.click(hamburger);

		const chartLink = screen.getByTestId('chart-button-mobile');
		await userEvent.click(chartLink);

		await waitFor(() => {
			expect(screen.queryByTestId('chart-button-mobile')).not.toBeInTheDocument();
		});
	});
});

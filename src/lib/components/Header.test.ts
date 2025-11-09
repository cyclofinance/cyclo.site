import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Header from './Header.svelte';

describe('Header.svelte', () => {
	beforeEach(() => {
		vi.resetModules();
	});
	it('renders the logo and WalletConnect component', async () => {
		render(Header, { props: { launched: true } });

		const logo = screen.getByAltText('Cyclo logo');
		expect(logo).toBeInTheDocument();

		const networkSwitcher = screen.getByTestId('network-switcher');
		expect(networkSwitcher).toBeInTheDocument();

		const walletConnectComponent = screen.getByTestId('wallet-connect');
		expect(walletConnectComponent).toBeInTheDocument();
	});

	it('shows the "App" button when PUBLIC_LAUNCHED is "true"', async () => {
		render(Header, { props: { launched: true } });

		const appButton = screen.getByTestId('app-button');
		expect(appButton).toBeInTheDocument();
	});

	it('does not show the "App" button when PUBLIC_LAUNCHED is not "true"', async () => {
		render(Header, { props: { launched: false } });

		const appButton = screen.queryByTestId('app-button');
		expect(appButton).not.toBeInTheDocument();
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Header from './Header.svelte';

describe('Header.svelte', () => {
	beforeEach(() => {
		vi.resetModules();
	});
	it('renders the logo and WalletConnect component', async () => {
		render(Header);

		const logo = screen.getByAltText('Cyclo logo');
		expect(logo).toBeInTheDocument();

		const walletConnectComponent = screen.getByTestId('wallet-connect');
		expect(walletConnectComponent).toBeInTheDocument();
	});

	it('shows the "App" button', async () => {
		render(Header);

		const appButton = screen.getByTestId('app-button');
		expect(appButton).toBeInTheDocument();
	});
});

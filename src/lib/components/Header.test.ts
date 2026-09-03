import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import Header from './Header.svelte';

describe('Header.svelte', () => {
	it('renders only the logo and the wallet button — no navigation', async () => {
		render(Header);

		expect(screen.getByAltText('Cyclo logo')).toBeInTheDocument();
		expect(screen.getByTestId('wallet-connect')).toBeInTheDocument();

		expect(screen.queryByTestId('app-button')).not.toBeInTheDocument();
		expect(screen.queryByTestId('docs-button')).not.toBeInTheDocument();
		expect(screen.queryByTestId('rewards-button')).not.toBeInTheDocument();
		expect(screen.queryByTestId('trade-button')).not.toBeInTheDocument();
		expect(screen.queryByTestId('chart-button')).not.toBeInTheDocument();
	});
});

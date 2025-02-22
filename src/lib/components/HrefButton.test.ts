import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import HrefButton from './HrefButton.svelte';

describe('Href Button Component', () => {
	it('should render with default class as "outset"', () => {
		render(HrefButton, { props: { inset: false, href: 'https://www.google.com' } });

		const button = screen.getByRole('link');

		expect(button).toBeInTheDocument();
		expect(button).toHaveClass('outset');
		expect(button).not.toHaveClass('inset');
	});

	it('should render with "inset" class when inset is true', () => {
		render(HrefButton, { props: { inset: true, href: 'https://www.google.com' } });

		const button = screen.getByRole('link');

		expect(button).toBeInTheDocument();
		expect(button).toHaveClass('inset');
		expect(button).not.toHaveClass('outset');
	});
});

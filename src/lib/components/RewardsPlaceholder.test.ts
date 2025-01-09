import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RewardsPlaceholder from './RewardsPlaceholder.svelte';

describe('RewardsPlaceholder Component', () => {
	it('should render RewardsInfo component', async () => {
		render(RewardsPlaceholder);
		expect(screen.getByTestId('rewards-placeholder')).toBeInTheDocument();
	});
});

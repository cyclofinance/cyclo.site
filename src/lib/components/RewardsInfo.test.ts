import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RewardsInfo from './RewardsInfo.svelte';

describe('RewardsInfo Component', () => {
	it('should render RewardsInfo component', async () => {
		render(RewardsInfo);
		expect(screen.getByTestId('rewards-info')).toBeInTheDocument();
	});
});

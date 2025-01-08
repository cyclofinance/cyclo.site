import { render, screen } from '@testing-library/svelte';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import Leaderboard from './Leaderboard.svelte';


describe('Leaderboard Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('displays loading spinner while fetching data', async () => {
		render(Leaderboard);
		// Expect the loading spinner to be visible initially
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});
});

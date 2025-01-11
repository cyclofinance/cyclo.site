import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RewardsPlaceholder from './RewardsPlaceholder.svelte';
import { mockSignerAddressStore } from '$lib/mocks/mockStores';

describe('RewardsPlaceholder Component', () => {
	it('should render RewardsInfo component', async () => {
		render(RewardsPlaceholder);
		expect(screen.getByTestId('rewards-placeholder')).toBeInTheDocument();
	});

	it('should show the connect message if there is no signerAddress', async () => {
		mockSignerAddressStore.mockSetSubscribeValue('');
		render(RewardsPlaceholder);
		await waitFor(() => {
			expect(screen.getByTestId('connect-message')).toBeInTheDocument();
		});
	});
});

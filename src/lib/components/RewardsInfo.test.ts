import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import RewardsInfo from './RewardsInfo.svelte';
import { mockSignerAddressStore } from '$lib/mocks/mockStores';
import Lock from '$lib/components/Lock.svelte';

describe('RewardsInfo Component', () => {
	it('should render RewardsInfo component', async () => {
		render(RewardsInfo);
		expect(screen.getByTestId('rewards-info')).toBeInTheDocument();
	});

	it('should show the connect message if there is no signerAddress', async () => {
		mockSignerAddressStore.mockSetSubscribeValue('');
		render(Lock);
		await waitFor(() => {
			expect(screen.getByTestId('connect-message')).toBeInTheDocument();
		});
	});
});

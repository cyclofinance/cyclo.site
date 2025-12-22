import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NetworkSelector from './NetworkSelector.svelte';
import { writable } from 'svelte/store';
import type { NetworkConfig } from '$lib/stores';
import { flare } from '@wagmi/core/chains';
import type { Hex } from 'viem';
import { mockWeb3Config } from '$lib/mocks/mockWagmiConfig';
import type { Config } from '@wagmi/core';

// Hoist mock stores before vi.mock calls
const { mockSelectedNetwork, mockSupportedNetworks, mockSwitchChain } = vi.hoisted(() => {
	const { writable } = require('svelte/store');
	const { flare } = require('@wagmi/core/chains');

	const mockSelectedNetwork = writable<NetworkConfig>({
		chain: flare,
		wFLRAddress: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as Hex,
		quoterAddress: '0x5B5513c55fd06e2658010c121c37b07fC8e8B705' as Hex,
		cusdxAddress: '0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8' as Hex,
		usdcAddress: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as Hex,
		explorerApiUrl: 'https://flare-explorer.flare.network/api',
		explorerUrl: 'https://flarescan.com',
		orderbookSubgraphUrl:
			'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
		rewardsSubgraphUrl:
			'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-12-19-a669/gn',
		tokens: []
	});

	const mockSupportedNetworks: NetworkConfig[] = [
		{
			chain: flare,
			wFLRAddress: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as Hex,
			quoterAddress: '0x5B5513c55fd06e2658010c121c37b07fC8e8B705' as Hex,
			cusdxAddress: '0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8' as Hex,
			usdcAddress: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as Hex,
			explorerApiUrl: 'https://flare-explorer.flare.network/api',
			explorerUrl: 'https://flarescan.com',
			orderbookSubgraphUrl:
				'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
			rewardsSubgraphUrl:
				'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-12-19-a669/gn',
			tokens: []
		},
		{
			chain: { ...flare, id: 999, name: 'Test Network' },
			wFLRAddress: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as Hex,
			quoterAddress: '0x5B5513c55fd06e2658010c121c37b07fC8e8B705' as Hex,
			cusdxAddress: '0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8' as Hex,
			usdcAddress: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as Hex,
			explorerApiUrl: 'https://flare-explorer.flare.network/api',
			explorerUrl: 'https://flarescan.com',
			orderbookSubgraphUrl:
				'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
			rewardsSubgraphUrl:
				'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-12-19-a669/gn',
			tokens: []
		}
	];

	const mockSwitchChain = vi.fn();

	return {
		mockSelectedNetwork,
		mockSupportedNetworks,
		mockSwitchChain
	};
});

// Import mockWagmiConfigStore - it's already hoisted in vitest-setup, but we need to access it
const { mockWagmiConfigStore } = await vi.hoisted(() => import('$lib/mocks/mockStores'));

// Mock @wagmi/core
vi.mock('@wagmi/core', () => ({
	switchChain: mockSwitchChain
}));

// Mock stores
vi.mock('$lib/stores', async () => {
	const actual = await vi.importActual('$lib/stores');
	return {
		...actual,
		selectedNetwork: mockSelectedNetwork,
		supportedNetworks: mockSupportedNetworks
	};
});

describe('NetworkSelector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSelectedNetwork.set(mockSupportedNetworks[0]);
		mockSwitchChain.mockResolvedValue(undefined);
	});

	it('renders the network selector dropdown', () => {
		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector');
		expect(selector).toBeInTheDocument();
		expect(selector).toBeInstanceOf(HTMLSelectElement);
	});

	it('displays all supported networks as options', () => {
		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;
		const options = Array.from(selector.options);

		expect(options).toHaveLength(mockSupportedNetworks.length);
		expect(options[0].textContent).toBe(flare.name);
		expect(options[0].value).toBe(flare.id.toString());
	});

	it('sets the selected network value correctly', () => {
		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;
		expect(selector.value).toBe(flare.id.toString());
	});

	it('updates selectedNetwork store when a different network is selected', async () => {
		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;
		const setSpy = vi.spyOn(mockSelectedNetwork, 'set');

		// Change to the same network (should not trigger set)
		await fireEvent.change(selector, { target: { value: flare.id.toString() } });

		// Should not call set because it's the same network
		expect(setSpy).not.toHaveBeenCalled();
	});

	it('does not switch chain when wagmi config is not available', async () => {
		// @ts-expect-error - Testing null case for wagmi config
		mockWagmiConfigStore.mockSetSubscribeValue(null);

		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;
		const setSpy = vi.spyOn(mockSelectedNetwork, 'set');

		// Switch to the second network (id: 999)
		await fireEvent.change(selector, { target: { value: '999' } });

		// Should update the store
		expect(setSpy).toHaveBeenCalled();
		// But should not call switchChain
		expect(mockSwitchChain).not.toHaveBeenCalled();
	});

	it('calls switchChain when wagmi config is available and network changes', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);

		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;
		const setSpy = vi.spyOn(mockSelectedNetwork, 'set');

		// Switch to the second network (id: 999)
		await fireEvent.change(selector, { target: { value: '999' } });

		// Should update the store
		expect(setSpy).toHaveBeenCalled();
		// Should call switchChain
		expect(mockSwitchChain).toHaveBeenCalledWith(mockWeb3Config, { chainId: 999 });
	});

	it('handles switchChain errors gracefully', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		mockSwitchChain.mockRejectedValue(new Error('User rejected'));

		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;

		// Switch to the second network (id: 999)
		await fireEvent.change(selector, { target: { value: '999' } });

		// Should still update the store even if switchChain fails
		expect(mockSelectedNetwork.set).toHaveBeenCalled();
		// Should log the error
		await new Promise((resolve) => setTimeout(resolve, 0)); // Wait for async error handling
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to switch chain:', expect.any(Error));

		consoleErrorSpy.mockRestore();
	});

	it('does not call switchChain when selecting the same network', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);

		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;

		// Select the same network
		await fireEvent.change(selector, { target: { value: flare.id.toString() } });

		// Should not call switchChain
		expect(mockSwitchChain).not.toHaveBeenCalled();
	});

	it('handles switchChain exceptions gracefully', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		mockSwitchChain.mockImplementation(() => {
			throw new Error('Switch chain exception');
		});

		render(NetworkSelector);

		const selector = screen.getByTestId('network-selector') as HTMLSelectElement;

		// Switch to the second network (id: 999)
		await fireEvent.change(selector, { target: { value: '999' } });

		// Should still update the store even if switchChain throws
		expect(mockSelectedNetwork.set).toHaveBeenCalled();
		// Should log the error
		expect(consoleErrorSpy).toHaveBeenCalledWith('Error switching chain:', expect.any(Error));

		consoleErrorSpy.mockRestore();
	});
});


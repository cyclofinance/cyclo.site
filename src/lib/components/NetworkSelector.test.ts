import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Config } from '@wagmi/core';
import { mockWeb3Config } from '$lib/mocks/mockWagmiConfig';

const { mockActiveNetworkKey, mockSupportedNetworks, mockSwitchNetwork } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable, get } = require('svelte/store');
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { flare } = require('@wagmi/core/chains');

	const mockActiveNetworkKey = writable('flare');

	const mockSupportedNetworks = [
		{
			key: 'flare',
			chain: flare,
			wFLRAddress: '0x0' as const,
			quoterAddress: '0x0' as const,
			cusdxAddress: '0x0' as const,
			usdcAddress: '0x0' as const,
			explorerApiUrl: '',
			explorerUrl: '',
			orderbookSubgraphUrl: '',
			rewardsSubgraphUrl: '',
			tokens: []
		},
		{
			key: 'test',
			chain: { ...flare, id: 999, name: 'Test Network' },
			wFLRAddress: '0x0' as const,
			quoterAddress: '0x0' as const,
			cusdxAddress: '0x0' as const,
			usdcAddress: '0x0' as const,
			explorerApiUrl: '',
			explorerUrl: '',
			orderbookSubgraphUrl: '',
			rewardsSubgraphUrl: '',
			tokens: []
		}
	];

	const mockSwitchNetwork = vi.fn();

	return { mockActiveNetworkKey, mockSupportedNetworks, mockSwitchNetwork };
});

vi.mock('@wagmi/core', () => ({
	switchNetwork: mockSwitchNetwork
}));

vi.mock('$lib/stores', async () => {
	const actual = await vi.importActual<typeof import('$lib/stores')>('$lib/stores');
	return {
		...actual,
		activeNetworkKey: mockActiveNetworkKey,
		supportedNetworks: mockSupportedNetworks,
		availableNetworks: mockSupportedNetworks,
		setActiveNetwork: (key: string) => {
			if (mockSupportedNetworks.some((n) => n.key === key)) mockActiveNetworkKey.set(key);
		}
	};
});

const { mockWagmiConfigStore } = await vi.hoisted(() => import('$lib/mocks/mockStores'));
import NetworkSelector from './NetworkSelector.svelte';

describe('NetworkSelector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockActiveNetworkKey.set('flare');
		mockSwitchNetwork.mockResolvedValue(undefined);
	});

	it('displays all supported networks as options', () => {
		render(NetworkSelector);

		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;
		const options = Array.from(selector.options);

		expect(options).toHaveLength(mockSupportedNetworks.length);
		expect(options[0].textContent).toBe(mockSupportedNetworks[0].chain.name);
		expect(options[0].value).toBe('flare');
	});

	it('does not call switchNetwork when selecting the same network', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);

		render(NetworkSelector);

		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;

		// Selecting the same value still fires a change event, so your component
		// must guard against it (see note below).
		await fireEvent.change(selector, { target: { value: 'flare' } });

		expect(mockSwitchNetwork).not.toHaveBeenCalled();
	});
	it('trims option labels (DOM whitespace safe)', () => {
		render(NetworkSelector);
	  
		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;
		const options = Array.from(selector.options);
	  
		expect(options[0].textContent?.trim()).toBe(mockSupportedNetworks[0].chain.name);
		expect(options[1].textContent?.trim()).toBe(mockSupportedNetworks[1].chain.name);
	  });
	  
	  it('calls setActiveNetwork for any change (even if wagmiConfig is null)', async () => {
		// @ts-expect-error
		mockWagmiConfigStore.mockSetSubscribeValue(null);
	  
		render(NetworkSelector);
	  
		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;
		const setSpy = vi.spyOn(mockActiveNetworkKey, 'set');
	  
		await fireEvent.change(selector, { target: { value: 'test' } });
	  
		expect(setSpy).toHaveBeenCalledWith('test');
	  });
	  
	  it('does not call switchNetwork if selected key is not in availableNetworks', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);
	  
		render(NetworkSelector);
	  
		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;
	  
		// Force an invalid value (not a real user interaction, but edge-case)
		await fireEvent.change(selector, { target: { value: 'unknown' } });
	  
		// Should NOT call switchNetwork (since selectedNetwork lookup fails)
		expect(mockSwitchNetwork).not.toHaveBeenCalled();
	  
		// Your mocked setActiveNetwork only sets if key exists → store stays 'flare'
		expect(selector.value).toBe(''); // DOM behavior for invalid selection in jsdom
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { get } = require('svelte/store');
		expect(get(mockActiveNetworkKey)).toBe('flare');
	  });
	  
	  
	  it('updates the select value if activeNetworkKey changes externally', async () => {
		render(NetworkSelector);
	  
		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;
		expect(selector.value).toBe('flare');
	  
		mockActiveNetworkKey.set('test');
	  
		// let Svelte flush
		await new Promise((r) => setTimeout(r, 0));
	  
		expect(selector.value).toBe('test');
	  });
	  
	  it('calls switchNetwork with the right arguments exactly once per change', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);
	  
		render(NetworkSelector);
	  
		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;
	  
		await fireEvent.change(selector, { target: { value: 'test' } });
	  
		expect(mockSwitchNetwork).toHaveBeenCalledTimes(1);
		expect(mockSwitchNetwork).toHaveBeenCalledWith(mockWeb3Config, { chainId: 999 });
	  });
	  
	  it('switches wallet network after updating the store (order check)', async () => {
		mockWagmiConfigStore.mockSetSubscribeValue(mockWeb3Config as Config);
	  
		// capture call order
		const calls: string[] = [];
		const originalSet = mockActiveNetworkKey.set.bind(mockActiveNetworkKey);
	  
		vi.spyOn(mockActiveNetworkKey, 'set').mockImplementation((v: string) => {
		  calls.push(`set:${v}`);
		  originalSet(v);
		});
	  
		mockSwitchNetwork.mockImplementation(async () => {
		  calls.push('switchNetwork');
		});
	  
		render(NetworkSelector);
	  
		const selector = screen.getByTestId('network-switcher') as HTMLSelectElement;
		await fireEvent.change(selector, { target: { value: 'test' } });
	  
		expect(calls[0]).toBe('set:test');
		expect(calls).toContain('switchNetwork');
		expect(calls.indexOf('set:test')).toBeLessThan(calls.indexOf('switchNetwork'));
	  });
	
	  
});

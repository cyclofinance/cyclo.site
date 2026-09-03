import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writable } from 'svelte/store';

const core = vi.hoisted(() => ({
	connect: vi.fn(async () => undefined),
	disconnect: vi.fn(async () => undefined),
	switchChain: vi.fn(async () => undefined),
	reconnect: vi.fn(),
	createConfig: vi.fn((opts: unknown) => ({ opts })),
	http: vi.fn(() => 'transport')
}));

const wagmiStores = await vi.hoisted(async () => {
	const { writable } = await import('svelte/store');
	return {
		chainId: writable<number | null>(null),
		signerAddress: writable<string | null>(null),
		wagmiConfig: writable<unknown>(undefined),
		wagmiLoaded: writable(false),
		web3Modal: writable<unknown>(undefined),
		init: vi.fn(async () => undefined)
	};
});

vi.mock('@wagmi/core', () => core);
vi.mock('@wagmi/connectors', () => ({ injected: vi.fn(() => 'injected-connector') }));
vi.mock('svelte-wagmi', () => wagmiStores);
vi.mock('$lib/stores', () => ({
	supportedNetworks: [{ chain: { id: 14 } }, { chain: { id: 42161 } }],
	targetNetwork: writable({ id: 14 })
}));

import { createConnectShim, initWallet } from './wallet';

describe('wallet bootstrap (browser-extension only)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		wagmiStores.chainId.set(null);
		wagmiStores.signerAddress.set(null);
	});

	it('creates a config with ONLY the injected connector and no WalletConnect', async () => {
		await initWallet();
		const opts = core.createConfig.mock.calls[0][0] as { connectors: unknown[] };
		expect(opts.connectors).toEqual(['injected-connector']);
		expect(JSON.stringify(opts)).not.toMatch(/walletConnect|projectId/i);
		expect(core.reconnect).toHaveBeenCalledTimes(1);
		expect(wagmiStores.init).toHaveBeenCalledTimes(1);
	});

	it('open() connects the extension on the target chain when disconnected', async () => {
		const config = { opts: {} } as never;
		await createConnectShim(config).open();
		expect(core.connect).toHaveBeenCalledWith(config, {
			connector: 'injected-connector',
			chainId: 14
		});
		expect(core.switchChain).not.toHaveBeenCalled();
	});

	it('open() switches chain instead of reconnecting when connected on the wrong chain', async () => {
		wagmiStores.signerAddress.set('0xabc');
		wagmiStores.chainId.set(42161);
		const config = { opts: {} } as never;
		await createConnectShim(config).open();
		expect(core.switchChain).toHaveBeenCalledWith(config, { chainId: 14 });
		expect(core.connect).not.toHaveBeenCalled();
	});

	it('open() on the right chain while connected does not switch', async () => {
		wagmiStores.signerAddress.set('0xabc');
		wagmiStores.chainId.set(14);
		const config = { opts: {} } as never;
		await createConnectShim(config).open();
		expect(core.switchChain).not.toHaveBeenCalled();
		expect(core.connect).toHaveBeenCalledTimes(1);
	});
});

/**
 * Wallet bootstrap for the private Cyclo manager.
 *
 * Deliberately NOT svelte-wagmi's `defaultConfig`: that helper always builds a
 * Reown/Web3Modal instance (analytics + onramp on, WalletConnect relay), which
 * this single-user tool never wants. The operator signs with a Trezor through
 * the Rabby browser extension, so the only connector is `injected()`.
 *
 * We still feed svelte-wagmi's stores so every existing `$signerAddress`,
 * `$chainId`, `$wagmiConfig` and `$web3Modal.open()` call site keeps working
 * unchanged. `web3Modal` becomes a tiny shim whose `open()` either connects the
 * extension or, if already connected on the wrong chain, asks it to switch.
 */
import { get } from 'svelte/store';
import { createConfig, connect, disconnect, http, reconnect, switchChain } from '@wagmi/core';
import { injected } from '@wagmi/connectors';
import { chainId, init, signerAddress, wagmiConfig, wagmiLoaded, web3Modal } from 'svelte-wagmi';
import { supportedNetworks, targetNetwork } from '$lib/stores';

export type ConnectShim = { open: () => Promise<void>; close: () => Promise<void> };

export const createConnectShim = (config: ReturnType<typeof createConfig>): ConnectShim => ({
	open: async () => {
		const wanted = get(targetNetwork).id;
		try {
			if (get(signerAddress) && get(chainId) !== wanted) {
				await switchChain(config, { chainId: wanted });
				return;
			}
			await connect(config, { connector: injected(), chainId: wanted });
		} catch (err) {
			// No extension installed, or the user rejected in Rabby/Trezor. Nothing
			// to recover here; the button simply stays "Connect".
			console.warn('[wallet] connect failed:', err);
		}
	},
	close: async () => {
		await disconnect(config);
	}
});

export const initWallet = async (): Promise<void> => {
	const chains = supportedNetworks.map((n) => n.chain);
	const config = createConfig({
		chains: [chains[0], ...chains.slice(1)],
		transports: Object.fromEntries(chains.map((c) => [c.id, http()])),
		connectors: [injected()]
	});
	wagmiConfig.set(config);
	web3Modal.set(createConnectShim(config));
	wagmiLoaded.set(true);
	reconnect(config).catch(() => {
		// No extension in this browser: nothing to reconnect to.
	});
	await init();
};

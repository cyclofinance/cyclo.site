import { derived, writable } from 'svelte/store';
import { chainId, signerAddress } from 'svelte-wagmi';
import { type Chain } from '@wagmi/core/chains';
import type { Hex } from 'viem';
import type { Receipt, CyToken } from './types';
import { flare } from '@wagmi/core/chains';

export interface NetworkConfig {
	chain: Chain;
	wFLRAddress: Hex;
	quoterAddress: Hex;
	cusdxAddress: Hex;
	usdcAddress: Hex;
	tokens: CyToken[];
	explorerApiUrl: string;
	explorerUrl: string;
	orderbookSubgraphUrl: string;
	rewardsSubgraphUrl: string;
}

// Network configurations
const flareConfig: NetworkConfig = {
	chain: flare,
	wFLRAddress: '0x1d80c49bbbcd1c0911346656b529df9e5c2f783d' as Hex,
	quoterAddress: '0x5b5513c55fd06e2658010c121c37b07fc8e8b705' as Hex,
	cusdxAddress: '0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8' as Hex,
	usdcAddress: '0xfbda5f676cb37624f28265a144a48b0d6e87d3b6' as Hex,
	explorerApiUrl: 'https://flare-explorer.flare.network/api',
	explorerUrl: 'https://flarescan.com',
	orderbookSubgraphUrl:
		'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
	rewardsSubgraphUrl:
		'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-12-19-a669/gn',
	tokens: [
		{
			name: 'cysFLR',
			symbol: 'cysFLR',
			decimals: 18,
			address: '0x19831cfb53a0dbead9866c43557c1d48dff76567' as Hex,
			underlyingAddress: '0x12e605bc104e93b45e1ad99f9e555f659051c2bb' as Hex, // sFlr
			underlyingSymbol: 'sFLR',
			receiptAddress: '0xd387fc43e19a63036d8fced559e81f5ddef7ef09' as Hex
		},
		{
			name: 'cyWETH',
			symbol: 'cyWETH',
			decimals: 18,
			address: '0xd8bf1d2720e9ffd01a2f9a2efc3e101a05b852b4' as Hex,
			underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex, // weth
			underlyingSymbol: 'WETH',
			receiptAddress: '0xbe2615a0fcb54a49a1eb472be30d992599fe0968' as Hex
		},
		{
			name: 'cyFXRP.ftso',
			symbol: 'cyFXRP.ftso',
			decimals: 6,
			address: '0xf23595ede14b54817397b1dab899ba061bdce7b5' as Hex,
			underlyingAddress: '0xad552a648c74d49e10027ab8a618a3ad4901c5be' as Hex, // fxrp
			underlyingSymbol: 'FXRP',
			receiptAddress: '0xc46600cebd84ed2fe60ec525df13e341d24642f2' as Hex
		}
	]
};

// Supported networks
export const supportedNetworks: NetworkConfig[] = [flareConfig];

// Selected network store
export const selectedNetwork = writable<NetworkConfig>(flareConfig);

// Derived stores for easy access to current network values
export const targetNetwork = derived(selectedNetwork, ($selectedNetwork) => $selectedNetwork.chain);
export const wFLRAddress = derived(
	selectedNetwork,
	($selectedNetwork) => $selectedNetwork.wFLRAddress
);
export const quoterAddress = derived(
	selectedNetwork,
	($selectedNetwork) => $selectedNetwork.quoterAddress
);
export const cusdxAddress = derived(
	selectedNetwork,
	($selectedNetwork) => $selectedNetwork.cusdxAddress
);
export const usdcAddress = derived(
	selectedNetwork,
	($selectedNetwork) => $selectedNetwork.usdcAddress
);
export const tokens = derived(selectedNetwork, ($selectedNetwork) => $selectedNetwork.tokens);

// Wrong network check - checks if connected to a different network than selected
export const wrongNetwork = derived(
	[chainId, signerAddress, selectedNetwork],
	([$chainId, $signerAddress, $selectedNetwork]) =>
		$signerAddress && $chainId !== $selectedNetwork.chain.id
);

export const myReceipts = writable<Receipt[]>([]);

// Selected cyToken - writable store that updates when network changes
export const selectedCyToken = writable<CyToken>(flareConfig.tokens[0]);

// Update selectedCyToken when network changes
selectedNetwork.subscribe((network) => {
	selectedCyToken.set(network.tokens[0]);
});

/**
 * Get the DexScreener chain identifier from a Chain object.
 * DexScreener uses lowercase chain names (e.g., 'flare', 'songbird').
 */
export function getDexScreenerChainName(chain: Chain): string {
	// Convert chain name to lowercase and normalize common patterns
	const normalized = chain.name
		.toLowerCase()
		.replace(/\s+(mainnet|canary|network|testnet).*$/i, '');
	return normalized;
}

/**
 * Check if the selected network is Flare.
 */
export function isFlareNetwork(networkConfig: NetworkConfig): boolean {
	return networkConfig.chain.id === flare.id;
}

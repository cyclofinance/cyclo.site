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
	tokens: [
		{
			name: 'cysFLR',
			symbol: 'cysFLR',
			decimals: 18,
			address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
			underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as Hex, // sFlr
			underlyingSymbol: 'sFLR',
			receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' as Hex
		},
		{
			name: 'cyWETH',
			symbol: 'cyWETH',
			decimals: 18,
			address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
			underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex, // weth
			underlyingSymbol: 'WETH',
			receiptAddress: '0xBE2615A0fcB54A49A1eB472be30d992599FE0968' as Hex
		},
		{
			name: 'cyFXRP.ftso',
			symbol: 'cyFXRP.ftso',
			decimals: 6,
			address: '0xF23595Ede14b54817397B1dAb899bA061BdCe7b5' as Hex,
			underlyingAddress: '0xAd552A648C74D49E10027AB8a618A3ad4901c5bE' as Hex, // fxrp
			underlyingSymbol: 'FXRP',
			receiptAddress: '0xC46600cEbD84Ed2FE60Ec525dF13E341D24642f2' as Hex
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

import { derived, writable, get } from 'svelte/store';
import { chainId, signerAddress } from 'svelte-wagmi';
import { type Chain } from '@wagmi/core/chains';
import type { Hex } from 'viem';
import type { Receipt, CyToken } from './types';
import { flare, arbitrum } from '@wagmi/core/chains';

export interface NetworkConfig {
	key: string;
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
	key: 'flare',
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
		'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-12-31-8be0/gn',
	tokens: [
		{
			name: 'cysFLR',
			symbol: 'cysFLR',
			decimals: 18,
			address: '0x19831cfb53a0dbead9866c43557c1d48dff76567' as Hex,
			underlyingAddress: '0x12e605bc104e93b45e1ad99f9e555f659051c2bb' as Hex, // sFlr
			underlyingSymbol: 'sFLR',
			receiptAddress: '0xd387fc43e19a63036d8fced559e81f5ddef7ef09' as Hex,
			chainId: flare.id,
			networkName: 'Flare',
			active: true
		},
		{
			name: 'cyWETH',
			symbol: 'cyWETH',
			decimals: 18,
			address: '0xd8bf1d2720e9ffd01a2f9a2efc3e101a05b852b4' as Hex,
			underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex, // weth
			underlyingSymbol: 'WETH',
			receiptAddress: '0xbe2615a0fcb54a49a1eb472be30d992599fe0968' as Hex,
			chainId: flare.id,
			networkName: 'Flare',
			active: true
		},
		{
			name: 'cyFXRP.ftso',
			symbol: 'cyFXRP.ftso',
			decimals: 6,
			address: '0xf23595ede14b54817397b1dab899ba061bdce7b5' as Hex,
			underlyingAddress: '0xad552a648c74d49e10027ab8a618a3ad4901c5be' as Hex, // fxrp
			underlyingSymbol: 'FXRP',
			receiptAddress: '0xc46600cebd84ed2fe60ec525df13e341d24642f2' as Hex,
			chainId: flare.id,
			networkName: 'Flare',
			active: true
		}
	].filter((token) => token.active)
};

const arbitrumConfig: NetworkConfig = {
	key: 'arbitrum',
	chain: arbitrum,
	wFLRAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Hex,
	quoterAddress: '0x0Fc73040b26E9bC8514fA028D998E73A254Fa76E' as Hex,
	cusdxAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex,
	usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex,
	explorerApiUrl: 'https://api.etherscan.io/v2/api',
	explorerUrl: 'https://arbiscan.io',
	orderbookSubgraphUrl:
		'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-arbitrum-one/2024-12-13-7435/gn',
	rewardsSubgraphUrl:
		'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-arbitrum-one/2025-12-30-00a4/gn',
	tokens: [
		{
			name: 'cyWETH.pyth',
			symbol: 'cyWETH.pyth',
			decimals: 18,
			address: '0x28C7747D7eA25ED3dDCd075c6CCC3634313a0F59' as Hex,
			underlyingAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Hex,
			underlyingSymbol: 'WETH',
			receiptAddress: '0x0E67a81B967c189Cf50353B0fE6fef572dC55319' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: true
		},
		{
			name: 'cyWBTC.pyth',
			symbol: 'cyWBTC.pyth',
			decimals: 8,
			address: '0x229917ac2842Eaab42060a1A9213CA78e01b572a' as Hex,
			underlyingAddress: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' as Hex,
			underlyingSymbol: 'WBTC',
			receiptAddress: '0x922A293D4d0af30D67A51e5510a487916a2bb494' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cycbBTC.pyth',
			symbol: 'cycbBTC.pyth',
			decimals: 8,
			address: '0x9fC9dA918552df0DAd6C00051351e335656da100' as Hex,
			underlyingAddress: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as Hex,
			underlyingSymbol: 'cbBTC',
			receiptAddress: '0x3a5eDe5AE4EC55F61c4aFf2CDfC920b5029Abf05' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyLINK.pyth',
			symbol: 'cyLINK.pyth',
			decimals: 18,
			address: '0x715aa5f9A5b3C2b51c432C9028C8692029BCE609' as Hex,
			underlyingAddress: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' as Hex,
			underlyingSymbol: 'LINK',
			receiptAddress: '0xDF66e921C8C29e1b1CA729848790A4D0bd6cbde9' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyDOT.pyth',
			symbol: 'cyDOT.pyth',
			decimals: 18,
			address: '0xEE6a7019679f96CED1Ea861Aae0c88D4481c7226' as Hex,
			underlyingAddress: '0x8d010bf9C26881788b4e6bf5Fd1bdC358c8F90b8' as Hex,
			underlyingSymbol: 'DOT',
			receiptAddress: '0x3B22b5cE7F9901fe6a676E57E079873775aAA331' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyUNI.pyth',
			symbol: 'cyUNI.pyth',
			decimals: 18,
			address: '0x7Cad3F864639738f9cC25952433cd844c07D16a4' as Hex,
			underlyingAddress: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' as Hex,
			underlyingSymbol: 'UNI',
			receiptAddress: '0xBF979c720c730738e25D766748F7063f223F1d27' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyPEPE.pyth',
			symbol: 'cyPEPE.pyth',
			decimals: 18,
			address: '0x4DD4230F3B4d6118D905eD0B6f5f20A3b2472166' as Hex,
			underlyingAddress: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00' as Hex,
			underlyingSymbol: 'PEPE',
			receiptAddress: '0xdb2C91313aAAaE40aedf6E91a1E78443241a64c0' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyENA.pyth',
			symbol: 'cyENA.pyth',
			decimals: 18,
			address: '0x5D938CAf878BD56ACcF2B27Fad9F697aA206dF40' as Hex,
			underlyingAddress: '0x58538e6A46E07434d7E7375Bc268D3cb839C0133' as Hex,
			underlyingSymbol: 'ENA',
			receiptAddress: '0x7426ddC75b522e40552ea24D647898fAcE0E2360' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyARB.pyth',
			symbol: 'cyARB.pyth',
			decimals: 18,
			address: '0xc83563177290bdd391DB56553Ed828413b7689bc' as Hex,
			underlyingAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548' as Hex,
			underlyingSymbol: 'ARB',
			receiptAddress: '0x3fEe841c184dCF93f15CD28144b6E5514fFfC18e' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cywstETH.pyth',
			symbol: 'cywstETH.pyth',
			decimals: 18,
			address: '0xC43ee790dc819dB728e2c5bB6285359BBdE7E016' as Hex,
			underlyingAddress: '0x5979D7b546E38E414F7E9822514be443A4800529' as Hex,
			underlyingSymbol: 'wstETH',
			receiptAddress: '0x8C1843A9f3278C94f6d79cebA9828596F524E898' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyXAUt0.pyth',
			symbol: 'cyXAUt0.pyth',
			decimals: 6,
			address: '0x6Ddc84F2FC195AE372501B01Bb1CA25CA3221776' as Hex,
			underlyingAddress: '0x40461291347e1eCbb09499F3371D3f17f10d7159' as Hex,
			underlyingSymbol: 'XAUt0',
			receiptAddress: '0x45D63e1C4cb7201ed45d75Af771BCfA9116a99Be' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		},
		{
			name: 'cyPYTH.pyth',
			symbol: 'cyPYTH.pyth',
			decimals: 6,
			address: '0x87f7B55D7CCc9Be93B0a8aE601801d79FA96FD4f' as Hex,
			underlyingAddress: '0xE4D5c6aE46ADFAF04313081e8C0052A30b6Dd724' as Hex,
			underlyingSymbol: 'PYTH',
			receiptAddress: '0x93AC50B43aFf21aDD1Ad2a626CF6E88C5e00ea39' as Hex,
			chainId: arbitrum.id,
			networkName: 'Arbitrum One',
			active: false
		}
	].filter((token) => token.active)
};

// Supported networks
export const supportedNetworks: NetworkConfig[] = [flareConfig, arbitrumConfig];

// Alias for backward compatibility (previous version used this name)
export const availableNetworks = supportedNetworks;

// Create a map for quick lookup
const networkConfigMap = new Map(supportedNetworks.map((config) => [config.key, config]));

// Helper function to resolve network config by key
const resolveNetworkConfig = (key: string): NetworkConfig => {
	return networkConfigMap.get(key) ?? flareConfig;
};

// Active network key store (using key makes it easier to persist)
export const activeNetworkKey = writable<string>(flareConfig.key);

// Derived store for the actual network config
export const activeNetworkConfig = derived(activeNetworkKey, (key) => resolveNetworkConfig(key));

// Alias for backward compatibility
export const selectedNetwork = activeNetworkConfig;

// Derived stores for easy access to current network values
export const targetNetwork = derived(activeNetworkConfig, (config) => config.chain);
export const wFLRAddress = derived(activeNetworkConfig, (config) => config.wFLRAddress);
export const quoterAddress = derived(activeNetworkConfig, (config) => config.quoterAddress);
export const cusdxAddress = derived(activeNetworkConfig, (config) => config.cusdxAddress);
export const usdcAddress = derived(activeNetworkConfig, (config) => config.usdcAddress);
export const tokens = derived(activeNetworkConfig, (config) => config.tokens);

// Combined tokens from all networks
export const allTokens = writable<CyToken[]>(
	supportedNetworks.flatMap((network) => network.tokens)
);

// Wrong network check - checks if connected to a different network than selected
export const wrongNetwork = derived(
	[chainId, signerAddress, targetNetwork],
	([$chainId, $signerAddress, $targetNetwork]) => $signerAddress && $chainId !== $targetNetwork.id
);

// Helper functions to set active network
export const setActiveNetwork = (key: string) => {
	if (!networkConfigMap.has(key)) {
		console.warn(`Attempted to set unknown network key "${key}"`);
		return;
	}
	activeNetworkKey.set(key);
};

export const setActiveNetworkByChainId = (id: number) => {
	const match = supportedNetworks.find((config) => config.chain.id === id);
	if (match) {
		activeNetworkKey.set(match.key);
	}
};

export const myReceipts = writable<Receipt[]>([]);

// Selected cyToken - writable store that updates when network changes
const initialTokens = get(tokens);
export const selectedCyToken = writable<CyToken>(initialTokens[0]);

// Update selectedCyToken when network changes - only reset if current token isn't valid for new network
tokens.subscribe((tokenList) => {
	const current = get(selectedCyToken);
	if (!tokenList.length) return;
	const isCurrentInList = current
		? tokenList.some(
				(token) =>
					token.address.toLowerCase() === current.address.toLowerCase() &&
					token.chainId === current.chainId
			)
		: false;
	if (!isCurrentInList) {
		selectedCyToken.set(tokenList[0]);
	}
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

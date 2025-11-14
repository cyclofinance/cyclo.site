import { derived, writable, get } from 'svelte/store';
import { chainId, signerAddress } from 'svelte-wagmi';
import { arbitrum, type Chain } from '@wagmi/core/chains';
import type { Hex } from 'viem';
import type { Receipt } from './types';
import { flare } from '@wagmi/core/chains';
import type { CyToken } from './types';
import { tokensForNetwork } from '$lib/constants';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Hex;

type NetworkAddresses = {
	wrappedNative?: Hex;
	quoter?: Hex;
	cusdx?: Hex;
	usdc?: Hex;
};

type BlockscoutReceiptSource = {
	type: 'blockscout';
	baseUrl: string;
	chainId: number;
};

type EtherscanReceiptSource = {
	type: 'etherscan';
	baseUrl: string;
	chainId: number;
	pageSize?: number;
};

export type ReceiptSource = BlockscoutReceiptSource | EtherscanReceiptSource;

type NetworkConfig = {
	key: string;
	displayName: string;
	chain: Chain;
	addresses: NetworkAddresses;
	tokens: CyToken[];
	receiptSource: ReceiptSource;
	orderbookSubgraphUrl: string;
	rewardsSubgraphUrl: string;
	explorerBaseUrl: string;
};

const networkConfigs: NetworkConfig[] = [
	{
		key: 'flare',
		displayName: 'Flare',
		chain: flare,
		addresses: {
			wrappedNative: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as Hex,
			quoter: '0x5B5513c55fd06e2658010c121c37b07fC8e8B705' as Hex,
			cusdx: '0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8' as Hex,
			usdc: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as Hex
		},
		receiptSource: {
			type: 'blockscout',
			baseUrl: 'https://flare-explorer.flare.network',
			chainId: flare.id
		},
		orderbookSubgraphUrl:
			'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-flare/2024-12-13-9dc7/gn',
		rewardsSubgraphUrl:
			'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare/2025-11-12-cb80/gn',
		explorerBaseUrl: 'https://flarescan.com/',
		tokens: [
			{
				name: 'cysFLR',
				symbol: 'cysFLR',
				decimals: 18,
				address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
				underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as Hex, // sFlr
				underlyingSymbol: 'sFLR',
				receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' as Hex,
				chainId: flare.id,
				networkKey: 'flare',
				networkName: 'Flare'
			},
			{
				name: 'cyWETH',
				symbol: 'cyWETH',
				decimals: 18,
				address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
				underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex, // weth
				underlyingSymbol: 'WETH',
				receiptAddress: '0xBE2615A0fcB54A49A1eB472be30d992599FE0968' as Hex,
				chainId: flare.id,
				networkKey: 'flare',
				networkName: 'Flare'
			},
			{
				name: 'cyFXRP',
				symbol: 'cyFXRP',
				decimals: 6,
				address: '0xF23595Ede14b54817397B1dAb899bA061BdCe7b5' as Hex,
				underlyingAddress: '0xAd552A648C74D49E10027AB8a618A3ad4901c5bE' as Hex, // fxrp
				underlyingSymbol: 'FXRP',
				receiptAddress: '0xC46600cEbD84Ed2FE60Ec525dF13E341D24642f2' as Hex,
				chainId: flare.id,
				networkKey: 'flare',
				networkName: 'Flare'
			}
		]
	},
	{
		key: 'arbitrum',
		displayName: 'Arbitrum One',
		chain: arbitrum,
		addresses: {
			wrappedNative: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Hex,
			quoter: ZERO_ADDRESS,
			cusdx: ZERO_ADDRESS,
			usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex
		},
		receiptSource: {
			type: 'etherscan',
			baseUrl: 'https://api.etherscan.io/v2/api',
			chainId: arbitrum.id,
			pageSize: 100
		},
		orderbookSubgraphUrl:
			'https://api.goldsky.com/api/public/project_clv14x04y9kzi01saerx7bxpg/subgraphs/ob4-arbitrum-one/2024-12-13-7435/gn',
		rewardsSubgraphUrl:
			'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-arbitrum-one/2025-11-14-9c16/gn',
		explorerBaseUrl: 'https://arbiscan.io/',
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
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
				networkKey: 'arbitrum',
				networkName: 'Arbitrum One'
			}
		]
	}
];

const networkConfigMap = new Map(networkConfigs.map((config) => [config.key, config]));

const resolveNetworkConfig = (key: string): NetworkConfig => {
	return networkConfigMap.get(key) ?? networkConfigs[0];
};

export const availableNetworks = networkConfigs;

export const activeNetworkKey = writable<string>(networkConfigs[0].key);

export const activeNetworkConfig = derived(activeNetworkKey, (key) => resolveNetworkConfig(key));

export const targetNetwork = derived(activeNetworkConfig, (config) => config.chain);

export const tokens = derived(activeNetworkConfig, (config) => config.tokens);

export const tradingTokens = derived(activeNetworkKey, (key) => tokensForNetwork(key));

export const orderbookSubgraphUrl = derived(
	activeNetworkConfig,
	(config) => config.orderbookSubgraphUrl
);

export const rewardsSubgraphUrl = derived(
	activeNetworkConfig,
	(config) => config.rewardsSubgraphUrl
);

export const explorerBaseUrl = derived(activeNetworkConfig, (config) => config.explorerBaseUrl);

export const receiptSource = derived(activeNetworkConfig, (config) => config.receiptSource);

export const wrappedNativeAddress = derived(
	activeNetworkConfig,
	(config) => config.addresses.wrappedNative ?? ZERO_ADDRESS
);

export const quoterAddress = derived(
	activeNetworkConfig,
	(config) => config.addresses.quoter ?? ZERO_ADDRESS
);

export const cusdxAddress = derived(
	activeNetworkConfig,
	(config) => config.addresses.cusdx ?? ZERO_ADDRESS
);

export const usdcAddress = derived(
	activeNetworkConfig,
	(config) => config.addresses.usdc ?? ZERO_ADDRESS
);

export const wrongNetwork = derived(
	[chainId, signerAddress, targetNetwork],
	([$chainId, $signerAddress, $targetNetwork]) => $signerAddress && $chainId !== $targetNetwork.id
);

export const myReceipts = writable<Receipt[]>([]);

const initialTokens = get(tokens);
export const selectedCyToken = writable<CyToken>(initialTokens[0]);

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

export const setActiveNetwork = (key: string) => {
	if (!networkConfigMap.has(key)) {
		console.warn(`Attempted to set unknown network key "${key}"`);
		return;
	}
	activeNetworkKey.set(key);
};

export const setActiveNetworkByChainId = (id: number) => {
	const match = networkConfigs.find((config) => config.chain.id === id);
	if (match) {
		activeNetworkKey.set(match.key);
	}
};

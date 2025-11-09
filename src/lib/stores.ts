import { derived, writable, get } from 'svelte/store';
import { chainId, signerAddress } from 'svelte-wagmi';
import { arbitrum, type Chain } from '@wagmi/core/chains';
import type { Hex } from 'viem';
import type { Receipt } from './types';
import { flare } from '@wagmi/core/chains';
import type { CyToken } from './types';

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
				address: '0x0Eb1dFC9f47f48b75dEb8DE45549BA017D6663c5' as Hex,
				underlyingAddress: '0xAd552A648C74D49E10027AB8a618A3ad4901c5bE' as Hex, // fxrp
				underlyingSymbol: 'FXRP',
				receiptAddress: '0xEf307A3EE59A6a140227EE98a95367D1F7cc8DE7' as Hex,
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
		tokens: [
			{
				name: 'cyWETH',
				symbol: 'cyWETH',
				decimals: 18,
				address: '0x4070D04f9D10093F9fbcbdfa075Df06892C90401' as Hex,
				underlyingAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' as Hex,
				underlyingSymbol: 'WETH',
				receiptAddress: '0x6EEdB55bC2E9B92F04B4EE3dc9FCF0834c223f25' as Hex,
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
				(token) => token.address.toLowerCase() === current.address.toLowerCase() && token.chainId === current.chainId
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

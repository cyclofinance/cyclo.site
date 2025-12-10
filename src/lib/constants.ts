import type { Token } from './types';
import type { Hex } from 'viem';
export const SUBGRAPH_URL =
	'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-flare-test/2025-12-09-09c9/gn';

export const ONE = 10n ** 18n;

export const tokens: Token[] = [
	{
		name: 'Bridged USDC (Stargate)',
		symbol: 'USDC.e',
		address: '0xfbda5f676cb37624f28265a144a48b0d6e87d3b6' as Hex,
		decimals: 6
	},
	{
		name: 'Bridged USDT (Stargate)',
		symbol: 'USDT.e',
		address: '0x0b38e83b86d491735feaa0a791f65c2b99535396' as Hex,
		decimals: 6
	},
	{
		name: 'Tether: USD₮0',
		symbol: 'USD₮0',
		address: '0xe7cd86e13ac4309349f30b3435a9d337750fc82d' as Hex,
		decimals: 6
	},
	{
		name: 'Staked FLR',
		symbol: 'sFLR',
		address: '0x12e605bc104e93b45e1ad99f9e555f659051c2bb' as Hex,
		decimals: 18
	},
	{
		name: 'Wrapped FLR',
		symbol: 'WFLR',
		address: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as Hex,
		decimals: 18
	},
	{
		name: 'Wrapped Ether',
		symbol: 'WETH',
		address: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex,
		decimals: 18
	}
];

export const TOTAL_REWARD = 2_000_000n * ONE; // 2M rFLR

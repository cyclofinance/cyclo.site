import { derived, writable } from 'svelte/store';
import { chainId, signerAddress } from 'svelte-wagmi';
import { type Chain } from '@wagmi/core/chains';
import type { Hex } from 'viem';
import type { Receipt } from './types';
import { flare } from '@wagmi/core/chains';
import type { CyToken } from './types';

export const wFLRAddress = writable<Hex>('0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d');
export const quoterAddress = writable<Hex>('0x5B5513c55fd06e2658010c121c37b07fC8e8B705');
export const cusdxAddress = writable<Hex>('0xfe2907dfa8db6e320cdbf45f0aa888f6135ec4f8');
export const usdcAddress = writable<Hex>('0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6');

export const targetNetwork = writable<Chain>(flare);
export const wrongNetwork = derived(
	[chainId, signerAddress, targetNetwork],
	([$chainId, $signerAddress, $targetNetwork]) => $signerAddress && $chainId !== $targetNetwork.id
);

export const myReceipts = writable<Receipt[]>([]);

export const tokens = [
	{
		name: 'cysFLR',
		address: '0x19831cfB53A0dbeAD9866C43557C1D48DfF76567' as Hex,
		underlyingAddress: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as Hex, // sFlr
		underlyingSymbol: 'sFLR',
		receiptAddress: '0xd387FC43E19a63036d8FCeD559E81f5dDeF7ef09' as Hex
	},
	{
		name: 'cyWETH',
		address: '0xd8BF1d2720E9fFD01a2F9A2eFc3E101a05B852b4' as Hex,
		underlyingAddress: '0x1502fa4be69d526124d453619276faccab275d3d' as Hex, // weth
		underlyingSymbol: 'WETH',
		receiptAddress: '0xBE2615A0fcB54A49A1eB472be30d992599FE0968' as Hex
	}
];

export const selectedCyToken = writable<CyToken>(tokens[0]);

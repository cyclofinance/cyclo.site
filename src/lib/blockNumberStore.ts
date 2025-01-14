import { writable } from 'svelte/store';
import { getBlock } from '@wagmi/core';
import type { Config } from '@wagmi/core';

const initialState = {
	blockNumber: BigInt(0),
	status: 'Checking' as 'Checking' | 'Ready' | 'Error'
};

const blockNumberStore = () => {
	const { subscribe, set, update } = writable(initialState);
	const reset = () => set(initialState);

	const refresh = async (config: Config) => {
		try {
			const block = await getBlock(config);
			update((state) => ({
				...state,
				blockNumber: block.number,
				status: 'Ready'
			}));
			return block.number;
		} catch (error) {
			console.error('Error getting block number:', error);
			update((state) => ({
				...state,
				status: 'Error'
			}));
			throw error;
		}
	};

	return {
		subscribe,
		reset,
		refresh
	};
};

export default blockNumberStore();

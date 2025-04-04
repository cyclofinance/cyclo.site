import type { DataFetcher } from 'sushi';
import { getContext } from 'svelte';
import { get } from 'svelte/store';
import type { Writable } from 'svelte/store';

export const useDataFetcher = () => {
	const dataFetcherStore: Writable<DataFetcher | undefined> = getContext('dataFetcher');
	return get(dataFetcherStore) as DataFetcher;
};

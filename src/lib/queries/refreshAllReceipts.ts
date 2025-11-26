import type { Receipt } from '$lib/types';
import { myReceipts, tokens, rewardsSubgraphUrl } from '$lib/stores';
import { get } from 'svelte/store';
import AccountReceipts from '$lib/queries/account-receipts.graphql?raw';
import { type Account } from '../../generated-graphql';

const PAGE_SIZE = 1000;
const STATIC_RECEIPT_BASE_NAMES = [
	'cyWETH',
	'cyFXRP',
	'cysFLR',
	'cyWBTC',
	'cycbBTC',
	'cyLINK',
	'cyDOT',
	'cyUNI',
	'cyPEPE',
	'cyENA',
	'cyARB',
	'cywstETH',
	'cyXAUt0',
	'cyPYTH'
] as const;

type ReceiptBalance = {
	receiptAddress: string;
	balance: string;
	id: string;
	tokenId: string;
};

type AccountWithReceipts = Account & {
	[key: string]: ReceiptBalance[] | undefined;
};

const normalizeTokenName = (tokenName: string) => tokenName.replace(/\.pyth$/, '');

export const refreshAllReceipts = async (
	signerAddress: string,
	setLoading: (loading: boolean) => void = () => {}
): Promise<Receipt[]> => {
	if (!signerAddress) return [];
	const rewardsSg = get(rewardsSubgraphUrl);
	const tokenList = get(tokens);

	const receiptBaseNames = Array.from(
		new Set([
			...STATIC_RECEIPT_BASE_NAMES,
			...(tokenList?.map((token) => normalizeTokenName(token.name)) ?? [])
		])
	);

	const aggregatedReceipts = receiptBaseNames.reduce<Record<string, ReceiptBalance[]>>(
		(acc, baseName) => {
			acc[baseName] = [];
			return acc;
		},
		{}
	);

	if (!receiptBaseNames.length) {
		setLoading(false);
		myReceipts.set([]);
		return [];
	}

	let skip = 0;
	let hasMore = true;

	while (hasMore) {
		const response = await fetch(rewardsSg, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: AccountReceipts,
				variables: {
					account: signerAddress.toLowerCase(),
					first: PAGE_SIZE,
					skip
				}
			})
		});

		const { data, errors } = (await response.json()) as {
			data?: {
				account?: AccountWithReceipts;
			};
			errors?: { message: string }[];
		};

		if (errors?.length) {
			console.error('AccountReceipts query errors:', errors);
			break;
		}

		const account = data?.account as AccountWithReceipts | undefined;

		if (!account) break;

		let shouldContinue = false;

		for (const baseName of receiptBaseNames) {
			const fieldName = `${baseName}ReceiptBalance`;
			const balances = ((account[fieldName] as unknown) || []) as ReceiptBalance[];
			aggregatedReceipts[baseName].push(...balances);

			if (balances.length === PAGE_SIZE) {
				shouldContinue = true;
			}
		}

		if (!shouldContinue) {
			hasMore = false;
			break;
		}

		skip += PAGE_SIZE;
	}

	console.log('sg data here : ', JSON.stringify(aggregatedReceipts));

	const receiptCollections = (tokenList ?? []).map((token) => {
		const baseName = normalizeTokenName(token.name);
		const balances = aggregatedReceipts[baseName] ?? [];

		return balances.map((receiptBalance) => ({
			chainId: token.chainId.toString(),
			tokenAddress: token.receiptAddress,
			tokenId: receiptBalance.tokenId,
			balance: BigInt(receiptBalance.balance),
			token: token.name
		}));
	});

	const allReceipts = receiptCollections.flat();

	setLoading(false);
	myReceipts.set(allReceipts);
	return allReceipts;
};

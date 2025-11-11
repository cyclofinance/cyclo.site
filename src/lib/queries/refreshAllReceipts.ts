import type { Config } from '@wagmi/core';
import type { Receipt } from '$lib/types';
import { myReceipts, tokens, rewardsSubgraphUrl } from '$lib/stores';
import { get } from 'svelte/store';
import { SUBGRAPH_URL } from '$lib/constants';
import AccountReceipts from '$lib/queries/account-receipts.graphql?raw';
import { type AccountReceiptsQuery } from '../../generated-graphql';

const PAGE_SIZE = 1000;

export const refreshAllReceipts = async (
	signerAddress: string,
	setLoading: (loading: boolean) => void = () => {}
): Promise<Receipt[]> => {
	if (!signerAddress) return [];
	const rewardsSg = get(rewardsSubgraphUrl);

	type AccountWithReceipts = NonNullable<AccountReceiptsQuery['account']>;
	type CyWETHReceipt = AccountWithReceipts['cyWETHReceiptBalance'][number];
	type CyFXRPReceipt = AccountWithReceipts['cyFXRPReceiptBalance'][number];
	type CysFLRReceipt = AccountWithReceipts['cysFLRReceiptBalance'][number];

	const aggregatedReceipts = {
		cyWETHReceiptBalance: [] as CyWETHReceipt[],
		cyFXRPReceiptBalance: [] as CyFXRPReceipt[],
		cysFLRReceiptBalance: [] as CysFLRReceipt[]
	};

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
			data?: AccountReceiptsQuery;
			errors?: { message: string }[];
		};

		if (errors?.length) {
			console.error('AccountReceipts query errors:', errors);
			break;
		}

		const account = data?.account;

		if (!account) break;

		const {
			cyWETHReceiptBalance = [],
			cyFXRPReceiptBalance = [],
			cysFLRReceiptBalance = []
		} = account;

		aggregatedReceipts.cyWETHReceiptBalance.push(...cyWETHReceiptBalance);
		aggregatedReceipts.cyFXRPReceiptBalance.push(...cyFXRPReceiptBalance);
		aggregatedReceipts.cysFLRReceiptBalance.push(...cysFLRReceiptBalance);

		const shouldContinue =
			cyWETHReceiptBalance.length === PAGE_SIZE ||
			cyFXRPReceiptBalance.length === PAGE_SIZE ||
			cysFLRReceiptBalance.length === PAGE_SIZE;

		if (!shouldContinue) {
			hasMore = false;
			break;
		}

		skip += PAGE_SIZE;
	}

	console.log('sg data here : ', JSON.stringify(aggregatedReceipts));

	const tokenList = get(tokens);

	const receiptBalanceMap = {
		cyWETH: aggregatedReceipts.cyWETHReceiptBalance,
		cyFXRP: aggregatedReceipts.cyFXRPReceiptBalance,
		cysFLR: aggregatedReceipts.cysFLRReceiptBalance
	} as const;

	const receiptCollections = tokenList.map((token) => {
		const balances =
			receiptBalanceMap[token.name as keyof typeof receiptBalanceMap] ?? [];

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

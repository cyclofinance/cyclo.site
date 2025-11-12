import type { Receipt } from '$lib/types';
import { myReceipts, tokens, rewardsSubgraphUrl } from '$lib/stores';
import { get } from 'svelte/store';
import AccountReceipts from '$lib/queries/account-receipts.graphql?raw';
import { type Account } from '../../generated-graphql';

const PAGE_SIZE = 1000;

type ReceiptBalance = {
	receiptAddress: string;
	balance: string;
	id: string;
	tokenId: string;
};

type AccountWithReceipts = Account & {
	cyWBTCReceiptBalance?: ReceiptBalance[];
	cycbBTCReceiptBalance?: ReceiptBalance[];
};

export const refreshAllReceipts = async (
	signerAddress: string,
	setLoading: (loading: boolean) => void = () => {}
): Promise<Receipt[]> => {
	if (!signerAddress) return [];
	const rewardsSg = get(rewardsSubgraphUrl);

	const aggregatedReceipts = {
		cyWETHReceiptBalance: [] as ReceiptBalance[],
		cyFXRPReceiptBalance: [] as ReceiptBalance[],
		cysFLRReceiptBalance: [] as ReceiptBalance[],
		cyWBTCReceiptBalance: [] as ReceiptBalance[],
		cycbBTCReceiptBalance: [] as ReceiptBalance[]
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
			data?: {
				account?: AccountWithReceipts;
			};
			errors?: { message: string }[];
		};

		if (errors?.length) {
			console.error('AccountReceipts query errors:', errors);
			break;
		}

		const account = data?.account;

		if (!account) break;

		// Cast receipt balances from JSON response (strings) to our ReceiptBalance type
		const cyWETHReceiptBalance = (account.cyWETHReceiptBalance ||
			[]) as unknown as ReceiptBalance[];
		const cyFXRPReceiptBalance = (account.cyFXRPReceiptBalance ||
			[]) as unknown as ReceiptBalance[];
		const cysFLRReceiptBalance = (account.cysFLRReceiptBalance ||
			[]) as unknown as ReceiptBalance[];
		const cyWBTCReceiptBalance = (account.cyWBTCReceiptBalance ||
			[]) as unknown as ReceiptBalance[];
		const cycbBTCReceiptBalance = (account.cycbBTCReceiptBalance ||
			[]) as unknown as ReceiptBalance[];

		aggregatedReceipts.cyWETHReceiptBalance.push(...cyWETHReceiptBalance);
		aggregatedReceipts.cyFXRPReceiptBalance.push(...cyFXRPReceiptBalance);
		aggregatedReceipts.cysFLRReceiptBalance.push(...cysFLRReceiptBalance);
		aggregatedReceipts.cyWBTCReceiptBalance.push(...cyWBTCReceiptBalance);
		aggregatedReceipts.cycbBTCReceiptBalance.push(...cycbBTCReceiptBalance);

		const shouldContinue =
			cyWETHReceiptBalance.length === PAGE_SIZE ||
			cyFXRPReceiptBalance.length === PAGE_SIZE ||
			cysFLRReceiptBalance.length === PAGE_SIZE ||
			cyWBTCReceiptBalance.length === PAGE_SIZE ||
			cycbBTCReceiptBalance.length === PAGE_SIZE;

		if (!shouldContinue) {
			hasMore = false;
			break;
		}

		skip += PAGE_SIZE;
	}

	console.log('sg data here : ', JSON.stringify(aggregatedReceipts));

	const tokenList = get(tokens);

	// Helper function to map token name to GraphQL receipt balance field
	// Handles tokens like "cyWETH.pyth" by extracting base name "cyWETH"
	const getReceiptBalancesForToken = (tokenName: string) => {
		// Remove .pyth suffix if present
		const baseName = tokenName.replace(/\.pyth$/, '');

		// Map token names to receipt balance arrays
		if (baseName === 'cyWETH') {
			return aggregatedReceipts.cyWETHReceiptBalance;
		} else if (baseName === 'cyFXRP') {
			return aggregatedReceipts.cyFXRPReceiptBalance;
		} else if (baseName === 'cysFLR') {
			return aggregatedReceipts.cysFLRReceiptBalance;
		} else if (baseName === 'cyWBTC') {
			return aggregatedReceipts.cyWBTCReceiptBalance;
		} else if (baseName === 'cycbBTC') {
			return aggregatedReceipts.cycbBTCReceiptBalance;
		}
		return [];
	};

	const receiptCollections = tokenList.map((token) => {
		const balances = getReceiptBalancesForToken(token.name);

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

import { type AccountStatusQuery } from '../../generated-graphql';
import AccountStatus from '$lib/queries/account-status.graphql?raw';
import { formatEther } from 'ethers';

export type PeriodStats = {
	period: string;
	totalNet: string;
	accountNet: string;
	percentage: number;
	proRataReward: number;
};

const TOTAL_REWARD = 1_000_000; // 1M rFLR

export async function fetchAccountStatus(account: string): Promise<{
	periodStats: PeriodStats[];
	transfers: NonNullable<AccountStatusQuery['sentTransfers']>;
}> {
	const response = await fetch(
		'https://api.goldsky.com/api/public/project_cm4zggfv2trr301whddsl9vaj/subgraphs/cyclo-rewards/0.23/gn',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: AccountStatus,
				variables: { account }
			})
		}
	);
	const data: AccountStatusQuery = (await response.json()).data;

	console.log(data);

	// Calculate period stats
	const totalNet = data.trackingPeriods[0]?.totalApprovedTransfersIn ?? '0';
	const accountNet = data.trackingPeriodForAccounts[0]?.netApprovedTransfersIn ?? '0';
	const percentage = (Number(formatEther(accountNet)) / Number(formatEther(totalNet))) * 100;
	const proRataReward = percentage * (TOTAL_REWARD / 100);

	const periodStats = [
		{
			period: 'JAN_2',
			totalNet,
			accountNet,
			percentage,
			proRataReward
		}
	];

	// Merge and sort transfers
	const sent = data.sentTransfers ?? [];
	const received = data.receivedTransfers ?? [];

	let i = 0,
		j = 0;
	const transfers = [];

	while (i < sent.length && j < received.length) {
		if (BigInt(sent[i].blockTimestamp) >= BigInt(received[j].blockTimestamp)) {
			transfers.push(sent[i++]);
		} else {
			transfers.push(received[j++]);
		}
	}

	return {
		periodStats,
		transfers: transfers.concat(sent.slice(i)).concat(received.slice(j))
	};
}

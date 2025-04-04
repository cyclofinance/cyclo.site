// Returns the period in seconds
export const getPeriodInSeconds = (
	period: string,
	periodUnit: 'Days' | 'Hours' | 'Minutes'
): number => {
	switch (periodUnit) {
		case 'Days':
			return Number(period) * 86400;
		case 'Hours':
			return Number(period) * 3600;
		case 'Minutes':
			return Number(period) * 60;
	}
};

// Returns 1/10 of the normalised daily amount
export const getMaxTradeAmount = (
	amount: bigint,
	period: string,
	periodUnit: 'Days' | 'Hours' | 'Minutes'
) => {
	const periodInSeconds = BigInt(getPeriodInSeconds(period, periodUnit));
	const normalisedDailyAmount = (amount * 8640n) / periodInSeconds;
	return normalisedDailyAmount;
};

// Get baseline
export const getBaseline = (selectedBuyOrSell: 'Buy' | 'Sell', selectedBaseline: string) => {
	const finalBaseline =
		selectedBuyOrSell === 'Buy' ? (1 / +selectedBaseline).toString() : selectedBaseline;
	return finalBaseline;
};

import { describe, it, expect } from 'vitest';
import { getPeriodInSeconds, getMaxTradeAmount, getBaseline } from './derivations';

describe('getPeriodInSeconds', () => {
	it('should convert days to seconds correctly', () => {
		expect(getPeriodInSeconds('1', 'Days')).toBe(86400);
		expect(getPeriodInSeconds('2', 'Days')).toBe(172800);
		expect(getPeriodInSeconds('0.5', 'Days')).toBe(43200);
	});

	it('should convert hours to seconds correctly', () => {
		expect(getPeriodInSeconds('1', 'Hours')).toBe(3600);
		expect(getPeriodInSeconds('2', 'Hours')).toBe(7200);
		expect(getPeriodInSeconds('0.5', 'Hours')).toBe(1800);
	});

	it('should convert minutes to seconds correctly', () => {
		expect(getPeriodInSeconds('1', 'Minutes')).toBe(60);
		expect(getPeriodInSeconds('2', 'Minutes')).toBe(120);
		expect(getPeriodInSeconds('0.5', 'Minutes')).toBe(30);
	});
});

describe('getMaxTradeAmount', () => {
	it('should calculate max trade amount correctly for days', () => {
		// For 1 day period, normalizedDailyAmount = amount * 8640 / 86400 = amount / 10
		expect(getMaxTradeAmount(BigInt(1000), '1', 'Days')).toBe(BigInt(100));

		// For 2 days period, normalizedDailyAmount = amount * 8640 / 172800 = amount / 20
		expect(getMaxTradeAmount(BigInt(1000), '2', 'Days')).toBe(BigInt(50));
	});

	it('should calculate max trade amount correctly for hours', () => {
		// For 1 hour period, normalizedDailyAmount = amount * 8640 / 3600 = amount * 2.4
		expect(getMaxTradeAmount(BigInt(1000), '1', 'Hours')).toBe(BigInt(2400));

		// For 2 hours period, normalizedDailyAmount = amount * 8640 / 7200 = amount * 1.2
		expect(getMaxTradeAmount(BigInt(1000), '2', 'Hours')).toBe(BigInt(1200));
	});

	it('should calculate max trade amount correctly for minutes', () => {
		// For 1 minute period, normalizedDailyAmount = amount * 8640 / 60 = amount * 144
		expect(getMaxTradeAmount(BigInt(1000), '1', 'Minutes')).toBe(BigInt(144000));

		// For 2 minutes period, normalizedDailyAmount = amount * 8640 / 120 = amount * 72
		expect(getMaxTradeAmount(BigInt(1000), '2', 'Minutes')).toBe(BigInt(72000));
	});
});

describe('getBaseline', () => {
	it('should return the baseline as is for Sell', () => {
		expect(getBaseline('Sell', '1.5')).toBe('1.5');
		expect(getBaseline('Sell', '2')).toBe('2');
		expect(getBaseline('Sell', '0.5')).toBe('0.5');
	});

	it('should invert the baseline for Buy', () => {
		expect(getBaseline('Buy', '1')).toBe('1');
		expect(getBaseline('Buy', '2')).toBe('0.5');
		expect(getBaseline('Buy', '0.5')).toBe('2');
	});
});

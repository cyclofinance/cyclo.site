import { describe, it, expect } from 'vitest';
import {
	validateSelectedAmount,
	validatePeriod,
	validateBaseline,
	validateOverrideDepositAmount
} from './validateDeploymentArgs';

describe('validateSelectedAmount', () => {
	it('should return error message when amount is undefined', () => {
		expect(validateSelectedAmount(undefined)).toBe('Amount is required');
	});

	it('should return error message when amount is empty string', () => {
		expect(validateSelectedAmount('')).toBe('Amount is required');
	});

	it('should return error message when amount is zero', () => {
		expect(validateSelectedAmount('0')).toBe('Amount must be greater than 0');
	});

	it('should return error message when amount is negative', () => {
		expect(validateSelectedAmount('-1')).toBe('Amount must be greater than 0');
	});

	it('should return undefined when amount is valid', () => {
		expect(validateSelectedAmount('1')).toBeUndefined();
		expect(validateSelectedAmount('0.1')).toBeUndefined();
		expect(validateSelectedAmount('100')).toBeUndefined();
	});
});

describe('validatePeriod', () => {
	it('should return error message when period is undefined', () => {
		expect(validatePeriod(undefined)).toBe('Period is required');
	});

	it('should return error message when period is empty string', () => {
		expect(validatePeriod('')).toBe('Period is required');
	});

	it('should return error message when period is zero', () => {
		expect(validatePeriod('0')).toBe('Period must be greater than 0');
	});

	it('should return error message when period is negative', () => {
		expect(validatePeriod('-1')).toBe('Period must be greater than 0');
	});

	it('should return undefined when period is valid', () => {
		expect(validatePeriod('1')).toBeUndefined();
		expect(validatePeriod('7')).toBeUndefined();
		expect(validatePeriod('30')).toBeUndefined();
	});
});

describe('validateBaseline', () => {
	it('should return error message when baseline is undefined', () => {
		expect(validateBaseline(undefined)).toBe('Baseline is required');
	});

	it('should return error message when baseline is empty string', () => {
		expect(validateBaseline('')).toBe('Baseline is required');
	});

	it('should return undefined when baseline is valid', () => {
		expect(validateBaseline('1')).toBeUndefined();
		expect(validateBaseline('0.5')).toBeUndefined();
		expect(validateBaseline('1.5')).toBeUndefined();
	});
});

describe('validateOverrideDepositAmount', () => {
	it('should return error message when override deposit amount is undefined', () => {
		expect(validateOverrideDepositAmount(undefined)).toBe('Override deposit amount is required');
	});

	it('should return error message when override deposit amount is empty string', () => {
		expect(validateOverrideDepositAmount('')).toBe('Override deposit amount is required');
	});

	it('should return undefined when override deposit amount is valid', () => {
		expect(validateOverrideDepositAmount('1')).toBeUndefined();
		expect(validateOverrideDepositAmount('0.5')).toBeUndefined();
		expect(validateOverrideDepositAmount('100')).toBeUndefined();
	});
});

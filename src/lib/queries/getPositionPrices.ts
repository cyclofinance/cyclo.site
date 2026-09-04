import { quoterAddress, cusdxAddress, usdcAddress, selectedNetwork } from '$lib/stores';
import { createConfig, http, readContract, simulateContract } from '@wagmi/core';
import { get } from 'svelte/store';
import { createClient, type Hex } from 'viem';
import { quoterAbi } from '../../generated';
import type { CyToken } from '$lib/types';

const ZERO_ACCOUNT = '0x0000000000000000000000000000000000000000' as Hex;
const ONE_18 = 10n ** 18n;

const priceOracleAbi = [
	{
		inputs: [],
		name: 'priceOracle',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	}
] as const;

const oraclePriceAbi = [
	{
		inputs: [],
		name: 'price',
		outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
		stateMutability: 'payable',
		type: 'function'
	}
] as const;

const buildConfig = () => {
	const network = get(selectedNetwork);
	return createConfig({
		chains: [network.chain],
		client({ chain }) {
			return createClient({ chain, transport: http() });
		}
	});
};

/**
 * Current USD price of the locked asset, 18 decimals.
 *
 * Read from the vault's own price oracle, which is the same source that set the
 * receipt's tokenId at lock time. Using the oracle rather than a DEX quote is
 * what makes "price now" and "price at lock" directly comparable — same
 * definition, same decimals, no cross-venue skew.
 *
 * `price()` is declared payable on IPriceOracleV2, so it is simulated rather
 * than read. Returns null if the oracle is unreachable.
 */
export const getUnderlyingUsdPrice = async (token: CyToken): Promise<bigint | null> => {
	try {
		const config = buildConfig();
		const oracle = await readContract(config, {
			address: token.address,
			abi: priceOracleAbi,
			functionName: 'priceOracle'
		});

		const { result } = await simulateContract(config, {
			address: oracle as Hex,
			abi: oraclePriceAbi,
			functionName: 'price',
			account: ZERO_ACCOUNT
		});
		return result as bigint;
	} catch (e) {
		console.error(`getUnderlyingUsdPrice(${token.name}) failed:`, e);
		return null;
	}
};

// Cyclo's cyToken pools are thin and disagree sharply between fee tiers, so we
// ask every tier and keep the best executable quote instead of pinning one.
const FEE_TIERS = [100, 500, 3000, 10000] as const;

const quote = async (
	config: ReturnType<typeof buildConfig>,
	tokenIn: Hex,
	tokenOut: Hex,
	amountIn: bigint,
	fee: number,
	blockNumber?: bigint
): Promise<bigint | null> => {
	try {
		const { result } = await simulateContract(config, {
			address: get(quoterAddress),
			abi: quoterAbi,
			functionName: 'quoteExactInputSingle',
			args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
			account: ZERO_ACCOUNT,
			...(blockNumber === undefined ? {} : { blockNumber })
		});
		return (result as readonly bigint[])[0];
	} catch {
		return null;
	}
};

const bestQuote = async (
	config: ReturnType<typeof buildConfig>,
	tokenIn: Hex,
	tokenOut: Hex,
	amountIn: bigint,
	blockNumber?: bigint
): Promise<bigint | null> => {
	const results = await Promise.all(
		FEE_TIERS.map((fee) => quote(config, tokenIn, tokenOut, amountIn, fee, blockNumber))
	);
	const valid = results.filter((r): r is bigint => r !== null && r > 0n);
	return valid.length ? valid.reduce((a, b) => (b > a ? b : a)) : null;
};

/**
 * Current market price of one cyToken in USD, 18 decimals.
 *
 * Quotes into USDC where a pool exists, otherwise into cUSDX with the cUSDX/USDC
 * leg applied so the result is genuinely USD rather than "per cUSDX".
 *
 * Returns null when no pool quotes — cyWETH currently has no live cUSDX or USDC
 * pool at any fee tier, so its market leg is genuinely unavailable rather than
 * zero, and callers must render it as unknown.
 */
export const getCyTokenUsdPrice = async (token: CyToken): Promise<bigint | null> =>
	cyTokenUsdPrice(token);

/**
 * The same market price, but as it stood at a past block — what the cyToken
 * was worth when the position was locked. The Flare public RPC serves archive
 * state (probed 2026-09-03: a call 1.5M blocks back answered), so this is one
 * quoter simulation per fee tier pinned to `blockNumber`.
 */
export const getCyTokenUsdPriceAt = async (
	token: CyToken,
	blockNumber: number
): Promise<bigint | null> => cyTokenUsdPrice(token, BigInt(blockNumber));

const cyTokenUsdPrice = async (token: CyToken, blockNumber?: bigint): Promise<bigint | null> => {
	try {
		const config = buildConfig();
		const usdc = get(usdcAddress);
		const cusdx = get(cusdxAddress);
		const oneToken = 10n ** BigInt(token.decimals);

		// Stablecoin legs are 6-decimal on Flare; scale to 18 before returning.
		const direct = await bestQuote(config, token.address, usdc, oneToken, blockNumber);
		if (direct !== null) return direct * 10n ** 12n;

		const viaCusdx = await bestQuote(config, token.address, cusdx, oneToken, blockNumber);
		if (viaCusdx === null) return null;

		// cUSDX is itself a cyToken and trades slightly off peg; convert properly.
		const cusdxInUsdc = await bestQuote(config, cusdx, usdc, 10n ** 6n, blockNumber);
		if (cusdxInUsdc === null) return null;

		return (viaCusdx * cusdxInUsdc * 10n ** 12n) / 10n ** 6n;
	} catch (e) {
		console.error(
			`getCyTokenUsdPrice(${token.name}${blockNumber ? ` @${blockNumber}` : ''}) failed:`,
			e
		);
		return null;
	}
};

export { ONE_18 };

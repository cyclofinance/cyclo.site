import type { Abi } from "viem";
import { iPythAbi } from "$lib/contracts/iPythAbi";
import { pythOracleAbi } from "$lib/contracts/pythOracleAbi";
import { erc20PriceOracleReceiptVaultAbi } from "$lib/contracts/erc20PriceOracleReceiptVaultAbi";

export const I_PYTH_ABI = iPythAbi as Abi;
export const PYTH_ORACLE_ABI = pythOracleAbi as Abi;
export const CYCLO_VAULT_ABI = erc20PriceOracleReceiptVaultAbi as Abi;

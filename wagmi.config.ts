import { defineConfig } from "@wagmi/cli";
import { actions } from "@wagmi/cli/plugins";
import { erc20Abi, type Abi } from "viem";
import { erc1155Abi } from "./src/lib/contracts/erc1155Abi";
import { quoterAbi } from "./src/lib/contracts/quoterAbi";
import { erc20PriceOracleReceiptVaultAbi } from "./src/lib/contracts/erc20PriceOracleReceiptVaultAbi";
export default defineConfig({
  out: "src/generated.ts",
  contracts: [
    {
      name: "erc20",
      abi: erc20Abi,
    },
    {
      name: "erc1155",
      abi: erc1155Abi as Abi,
    },
    {
      name: "quoter",
      abi: quoterAbi as Abi,
    },
    {
      name: "ERC20PriceOracleReceiptVault",
      abi: erc20PriceOracleReceiptVaultAbi,
    },
  ],
  plugins: [actions()],
});

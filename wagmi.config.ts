import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";
import { actions } from "@wagmi/cli/plugins";
import { erc20Abi, type Abi } from "viem";
import { erc1155Abi } from "./src/lib/contracts/erc1155Abi";
import { quoterAbi } from "./src/lib/contracts/quoterAbi";
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
  ],
  plugins: [
    actions(),
    foundry({
      include: ["ERC20PriceOracleReceiptVault.json"],
      project: "./cyclo.sol",
    }),
  ],
});

## Setting up

Run the following commands in sequence

```sh
nix develop
cd cyclo.sol
npm ci
forge build
cd ..
cp env.example .env
# Edit .env and fill in PUBLIC_WALLETCONNECT_ID and PUBLIC_ETHERSCAN_API_KEY
npm run codegen
npm run graphql-codegen
```

`npm run codegen` generates the required JS actions for making contract calls via `@wagmi/cli`.
`npm run graphql-codegen` generates `src/generated-graphql.ts` from the subgraph schema.

## Setting up

From a fresh clone, run the following commands in sequence (this mirrors
`.github/workflows/test.yaml`):

```sh
git submodule update --init --recursive   # cyclo.sol + its forge deps
cp env.example .env                       # then fill in PUBLIC_WALLETCONNECT_ID
nix develop
npm ci                                    # the repo root holds the site's package.json
cd cyclo.sol
npm ci
forge build
cd ..
npm run codegen
npm run graphql-codegen
```

`npm run codegen` generates the required JS actions for making contract calls via `@wagmi/cli`; it reads the forge artifacts from `cyclo.sol/out/`, so it fails until the submodule is checked out and built.
`npm run graphql-codegen` generates `src/generated-graphql.ts` from the subgraph schema.

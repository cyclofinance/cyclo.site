<script lang="ts">
  import { formatEther, formatUnits } from "ethers";
  import balancesStore from "$lib/balancesStore";
  import { formatNumberWithAbbreviations } from "$lib/methods";
  import { Spinner } from "flowbite-svelte";
  import { supportedNetworks, allTokens } from "$lib/stores";
  import type { CyToken } from "$lib/types";

  const UNAVAILABLE = "Unavailable";

  function calculateMarketCap(
    price: bigint | null | undefined,
    supply: bigint | null | undefined,
  ): bigint | null {
    if (price === null || supply === null) return null;
    return ((price ?? 0n) * (supply ?? 0n)) / BigInt(1e6);
  }

  const display = (
    value: bigint | null | undefined,
    format: (value: bigint) => string,
  ) => (value === null ? UNAVAILABLE : format(value ?? 0n));

  const tokensByNetwork = supportedNetworks.map((network) => ({
    key: network.key,
    name: network.chain?.name ?? network.key,
    tokens: network.tokens,
  }));

  // usdTvl is stored with token.decimals; normalize to 18 before summing.
  // A token whose read failed makes the sum unknown.
  const sumUsdTvl = (
    tokens: CyToken[],
    stats: typeof $balancesStore.stats,
  ): bigint | null =>
    tokens.reduce<bigint | null>((sum, token) => {
      if (sum === null || stats[token.name]?.usdTvl === null) return null;
      const usdTvl = stats[token.name]?.usdTvl || 0n;
      const normalizedUsdTvl =
        token.decimals === 18
          ? usdTvl
          : token.decimals < 18
            ? usdTvl * BigInt(10 ** (18 - token.decimals))
            : usdTvl / BigInt(10 ** (token.decimals - 18));
      return sum + normalizedUsdTvl;
    }, 0n);

  $: globalTvl = sumUsdTvl($allTokens, $balancesStore.stats);

  $: networkTvls = tokensByNetwork.reduce(
    (acc, network) => ({
      ...acc,
      [network.key]: sumUsdTvl(network.tokens, $balancesStore.stats),
    }),
    {} as Record<string, bigint | null>,
  );
</script>

<footer
  class="flex w-full flex-col justify-center bg-[#1C02B8] px-2 py-6 text-sm text-white sm:px-6 sm:text-base"
>
  {#if $balancesStore.statsLoading}
    <div class="flex justify-center py-8">
      <Spinner size="8" color="white" />
    </div>
  {:else}
    <div
      class="flex w-full max-w-2xl flex-col justify-between gap-4 self-center sm:gap-0"
    >
      <div class="border-b border-white/20 pb-2">
        <div
          class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
          data-testId="global-tvl"
        >
          <span>Global TVL</span>
          <span
            >{display(
              globalTvl,
              (v) => `$ ${Number(formatUnits(v, 18))}`,
            )}</span
          >
        </div>
      </div>
      {#each tokensByNetwork as network (network.key)}
        <div
          class="flex flex-col gap-3 border-b border-white/20 pb-3 last:border-0"
        >
          <div
            class="flex items-center justify-between text-sm font-semibold uppercase"
          >
            <span>{network.name}</span>
            <span
              >{display(
                networkTvls[network.key],
                (v) => `$ ${Number(formatUnits(v, 18))}`,
              )}</span
            >
          </div>

          {#each network.tokens as token (token.name)}
            <div
              class="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <div class="font-bold">
                {token.symbol}
                <span class="text-xs font-normal text-white/70"
                  >({token.networkName})</span
                >
              </div>
              <div
                class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
                data-testId="lock-price"
              >
                <span
                  >Current Lock Price ({token.symbol} per {token.underlyingSymbol})</span
                >
                <span
                  >{display($balancesStore.stats[token.name]?.lockPrice, (v) =>
                    Number(formatEther(v)).toString(),
                  )}</span
                >
              </div>
              <div
                class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
                data-testId="price"
              >
                <span>Current {token.symbol} Price</span>
                <span>
                  {display(
                    $balancesStore.stats[token.name]?.price,
                    (v) => `$ ${Number(formatUnits(v, 6))}`,
                  )}
                </span>
              </div>
              {#if $balancesStore.stats[token.name]?.supply || $balancesStore.stats[token.name]?.supply === null}
                <div
                  class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
                  data-testId="supply"
                >
                  <span>Total {token.symbol} supply</span>
                  <span>
                    {display($balancesStore.stats[token.name].supply, (v) =>
                      formatNumberWithAbbreviations(
                        Number(formatUnits(v, token.decimals)),
                      ),
                    )}
                  </span>
                </div>
              {/if}
              <div
                class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
                data-testId={`market-cap-${token.symbol}`}
              >
                <span>{token.symbol} Market Cap</span>
                <span>
                  {display(
                    calculateMarketCap(
                      $balancesStore.stats[token.name]?.price,
                      $balancesStore.stats[token.name]?.supply,
                    ),
                    (v) => `$ ${Number(formatUnits(v, token.decimals))}`,
                  )}
                </span>
              </div>
              {#if $balancesStore.stats[token.name]?.underlyingTvl || $balancesStore.stats[token.name]?.underlyingTvl === null}
                <div
                  class="flex flex-col justify-between gap-0 sm:flex-row sm:gap-2"
                  data-testId="tvl"
                >
                  <span>Total Value Locked</span>
                  <span>
                    {display(
                      $balancesStore.stats[token.name].underlyingTvl,
                      (v) =>
                        `${Number(formatUnits(v, token.decimals))} ${token.underlyingSymbol}`,
                    )}
                    / {display(
                      $balancesStore.stats[token.name].usdTvl,
                      (v) => `$ ${Number(formatUnits(v, token.decimals))}`,
                    )}
                  </span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</footer>

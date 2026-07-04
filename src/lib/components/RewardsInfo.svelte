<script lang="ts">
  import Card from "./Card.svelte";
  import { base } from "$app/paths";
  import { REWARD_EPOCHS } from "$lib/constants";
</script>

<Card>
  <div class="prose space-y-6" data-testid="rewards-info">
    <div>
      <h2 class="mt-0 text-xl font-semibold text-white">Cyclo Rewards</h2>
      <p class="text-gray-300">
        Rewards are distributed each month to eligible cyToken holders. The
        reward pool for each epoch is shown below.
      </p>
      <ul class="mt-2 list-disc space-y-1 pl-4 text-gray-300">
        {#each REWARD_EPOCHS as epoch}
          <li>
            <span class="font-semibold text-white">{epoch.label}</span>:
            {epoch.startUtc} – {epoch.endUtc} — {epoch.poolRflr} rFLR
          </li>
        {/each}
      </ul>
      <p class="text-gray-300">
        Note that rewards are calculated based on all eligible transfers since
        the cyToken deployment, not from the beginning of the period.
      </p>
    </div>

    <div class="space-y-4 text-gray-300">
      <div>
        <h3 class="mb-2 font-semibold text-white">
          Important: These Numbers Are Indicative
        </h3>
        <p>
          The values shown here are a real-time estimate based on current
          holdings. Your actual rewards will be calculated from:
        </p>
      </div>

      <ul class="list-disc space-y-1 pl-4">
        <li>
          The average of your eligible balance across two random monthly
          snapshots
        </li>
        <li>
          Your share of all participants' average holdings at those snapshots
        </li>
        <li>Final rewards may be higher or lower than shown here</li>
        <li>
          The displayed APY is based on current participation and will decrease
          as more holders join
        </li>
      </ul>

      <p>
        Rewards are earned by acquiring cysFLR through approved sources
        (Raindex, SparkDEX, or BlazeSwap) and holding it.
      </p>
      <a
        href={base + "/docs/rflr-incentives"}
        class="text-white hover:underline">Learn more →</a
      >
    </div>
  </div>
</Card>

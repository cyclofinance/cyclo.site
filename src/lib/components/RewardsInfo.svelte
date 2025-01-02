<script lang="ts">
	import Card from './Card.svelte';
	import { base } from '$app/paths';
</script>

<Card>
	<div class="prose space-y-6">
		<div>
			<h2 class="mt-0 text-xl font-semibold text-white">Cyclo Rewards</h2>
			<p class="text-gray-300">
				The first rewards period runs from January 2, 2025 at 00:00 UTC to February 1, 2025 at 00:00
				UTC. After this period ends, 1M rFLR will be distributed to eligible cysFLR holders based on
				their participation during the period.
			</p>
			<p class="text-gray-300">
				Note that rewards are calculated based on all transfers since the cysFLR token deployment,
				not from the beginning of the period.
			</p>
		</div>

		<div class="space-y-4 text-gray-300">
			<div>
				<h3 class="mb-2 font-semibold text-white">Important: These Numbers Are Indicative</h3>
				<p>
					The values shown here are a real-time estimate based on current holdings. Your actual
					rewards will be calculated from:
				</p>
			</div>

			<ul class="list-disc space-y-1 pl-4">
				<li>The average of your eligible balance across two random monthly snapshots</li>
				<li>Your share of all participants' average holdings at those snapshots</li>
				<li>Final rewards may be higher or lower than shown here</li>
				<li>
					The displayed APY is based on current participation and will decrease as more holders join
				</li>
			</ul>

			<p>
				Rewards are earned by acquiring cysFLR through approved sources (Raindex, SparkDEX, or
				BlazeSwap) and holding it.
			</p>
			<a href={base + '/docs/rflr-incentives'} class="text-white hover:underline">Learn more →</a>
		</div>
	</div>
</Card>

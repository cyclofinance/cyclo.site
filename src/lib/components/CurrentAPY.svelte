<script lang="ts">
	import Card from './Card.svelte';
	import { base } from '$app/paths';

	// This would ideally come from an API or be calculated, but for now we'll hardcode it
	const CURRENT_APY = 99145.3;
</script>

<Card>
	<div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
		<div class="space-y-4">
			<h2 class="text-xl font-semibold text-white">Cyclo Rewards</h2>
			<div class="space-y-2 text-gray-300">
				<p>
					Cyclo distributes 1M rFLR tokens monthly to users who buy and hold cysFLR. Rewards are
					allocated pro-rata based on the amount of cysFLR held. The amount of cysFLR held is
					calculated as transfers in from approved sources, less all transfers out. Approved sources
					are SparkDEX, Blazeswap and Raindex.
				</p>
				<p>
					<a href={base + '/docs/rewards'} class="text-primary hover:underline">
						Learn more about how rewards work →
					</a>
				</p>
			</div>
		</div>
		<div
			class="flex flex-col items-center justify-center border-t pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"
		>
			<div class="text-sm text-gray-300">Current APY</div>
			<div class="text-4xl font-bold text-white">{CURRENT_APY}%</div>
		</div>
	</div>
</Card>

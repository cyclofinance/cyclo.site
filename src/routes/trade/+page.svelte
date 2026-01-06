<script lang="ts">
	import Select from '$lib/components/Select.svelte';
	import DcaStrategy from '$lib/components/DcaStrategy.svelte';
	import DsfStrategy from '$lib/components/DsfStrategy.svelte';

	type StrategyType = 'DCA' | 'DSF';

	const strategyOptions: { value: StrategyType; label: string }[] = [
		{ value: 'DCA', label: 'DCA Strategy' },
		{ value: 'DSF', label: 'DSF Strategy' }
	];

	let selectedStrategy = strategyOptions[0];
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-3">
		<span class="text-sm text-gray-200">Strategy Type</span>
		<Select
			options={strategyOptions}
			bind:selected={selectedStrategy}
			getOptionLabel={(option) => option.label}
			dataTestId="strategy-select"
		/>
	</div>

	{#if selectedStrategy.value === 'DCA'}
		<DcaStrategy />
	{:else}
		<DsfStrategy />
	{/if}
</div>


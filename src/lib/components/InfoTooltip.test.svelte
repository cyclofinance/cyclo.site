<script lang="ts">
	import InfoTooltip from './InfoTooltip.svelte';

	export let tooltipContent = 'Test tooltip content';
</script>

<div>
	<InfoTooltip>
		{tooltipContent}
	</InfoTooltip>
</div>

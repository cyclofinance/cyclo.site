<script lang="ts">
	import dcaStrategy from '$lib/raindex/auction-dca.rain?raw';
	import { DotrainOrderGui, type GuiFieldDefinitionCfg } from '@rainlanguage/orderbook/js_api';
	import { onMount } from 'svelte';

	let gui: DotrainOrderGui;
	let fieldsDefs: GuiFieldDefinitionCfg[];

	onMount(async () => {
		gui = await DotrainOrderGui.chooseDeployment(dcaStrategy, 'flare');
		fieldsDefs = gui.getAllFieldDefinitions();
	});
</script>

<div class="container mx-auto mt-24">Trade</div>
<div id="gui-container"></div>

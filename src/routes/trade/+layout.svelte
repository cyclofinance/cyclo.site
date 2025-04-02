<script lang="ts">
	import HrefButton from '$lib/components/HrefButton.svelte';
	import { base } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import { page } from '$app/stores';
</script>

<Card size="lg" customClass="mx-auto mt-14">
	<div class="flex gap-4">
		<HrefButton href={base + '/trade/dca'} inset={$page.url.pathname.includes('/trade/dca')}>
			DCA
		</HrefButton>
		<HrefButton href={base + '/trade/limit'} inset={$page.url.pathname.includes('/trade/limit')}>
			Limit
		</HrefButton>
	</div>
	<slot />
</Card>

<script lang="ts">
	import AccountStatus from '$lib/components/AccountStatus.svelte';
	import { page } from '$app/stores';
	import CurrentAPY from '$lib/components/CurrentAPY.svelte';
</script>

<div class="mx-auto max-w-7xl space-y-8 px-4 py-8">
	<AccountStatus account={$page.params.account} />
</div>

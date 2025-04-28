<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import TransactionModal from '$lib/components/TransactionModal.svelte';
</script>

<Card size="lg" customClass="mx-auto mt-6 mb-14">
	<slot />
</Card>
<TransactionModal />

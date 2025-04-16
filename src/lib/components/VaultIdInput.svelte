<script lang="ts">
	import { isHex } from 'viem';

	export let vaultId = '';
	export let placeholder = '0x123...';
	export let isError = false;

	let error: string | undefined = undefined;

	$: isError = error !== '' && error !== undefined;

	const validate = () => {
		error = undefined;
		if (!vaultId) {
			return null;
		}

		if (!isHex(vaultId)) {
			error = 'Invalid vault id: must be a valid hex string';
		}

		return null;
	};
</script>

<div class="vault-id-input">
	<input
		class="w-full rounded-sm border border-white bg-primary px-2 py-0 text-right text-2xl text-white outline-none [appearance:textfield] focus:ring-0 sm:text-lg md:text-2xl [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
		type="text"
		bind:value={vaultId}
		{placeholder}
		on:blur={validate}
	/>
	{#if error}
		<span class="text-sm text-red-500">{error}</span>
	{/if}
</div>

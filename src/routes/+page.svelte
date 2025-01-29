<script lang="ts">
	import { goto } from '$app/navigation';
	import logo from '$lib/images/logo-white.svg';
	import { ArrowsRepeatCountOutline, LockOpenOutline, LockOutline } from 'flowbite-svelte-icons';

	let loadingDots = '.';
	function updateLoadingDots() {
		loadingDots = loadingDots.length >= 3 ? '.' : loadingDots + '.';
	}
	setInterval(updateLoadingDots, 500);
</script>

<main class="min-h-screen bg-[#1C02B8] p-4 font-mono text-white">
	<div class="main-content flex flex-col gap-12">
		<div class="mx-auto max-w-4xl border-2 border-white bg-primary p-4 sm:p-12">
			<div class="mb-8 flex flex-col gap-6">
				<img src={logo} alt="Cyclo logo" class="mb-4 w-full max-w-[400px]" />
				<h1 class="flex items-center gap-3 text-4xl font-bold tracking-wider">
					LEVERAGE WITHOUT FEAR_
				</h1>
				<p class="mb-4 text-xl">
					Access the power of leverage while keeping your collateral completely safe from
					liquidations.
				</p>
			</div>
			<div class="flex flex-col items-start gap-4">
				<div class="inline-block border border-dashed border-white p-3 text-lg opacity-80">
					<span class="text-green-400">&gt; EXECUTING</span> pure_defi_freedom.exe
				</div>
				<button
					on:click={() => {
						goto('/lock');
					}}
					class="border-outset group w-fit max-w-sm border-2 border-white bg-green-400 p-6 text-center text-xl font-bold tracking-wider transition-colors hover:bg-green-500"
					data-testid="get-started-button"
				>
					GET STARTED_
				</button>
			</div>
		</div>

		<div
			class="group mx-auto w-full max-w-4xl border-2 border-white bg-primary p-4 transition-colors hover:bg-blue-700 sm:p-12"
		>
			<h2 class="mb-8 flex items-center gap-2 text-2xl">
				[ PURE DEFI FREEDOM ] <span class="text-xs opacity-70 group-hover:opacity-100"
					>loading{loadingDots}</span
				>
			</h2>
			<div class="grid gap-6 md:grid-cols-3">
				<div class="space-y-3">
					<p class="flex items-center gap-2">
						<span class="text-green-400">[✓]</span>
						<span>No Liquidations</span>
					</p>
					<p class="flex items-center gap-2">
						<span class="text-green-400">[✓]</span>
						<span>Always Solvent</span>
					</p>
				</div>
				<div class="space-y-3">
					<p class="flex items-center gap-2">
						<span class="text-green-400">[✓]</span>
						<span>Non-Custodial</span>
					</p>
					<p class="flex items-center gap-2">
						<span class="text-green-400">[✓]</span>
						<span>No Governance</span>
					</p>
				</div>
				<div class="space-y-3">
					<p class="flex items-center gap-2">
						<span class="text-green-400">[✓]</span>
						<span>Zero Fees</span>
					</p>
					<p class="flex items-center gap-2">
						<span class="text-green-400">[✓]</span>
						<span>Permissionless</span>
					</p>
				</div>
			</div>
		</div>

		<div class="mx-auto grid max-w-4xl gap-12 md:grid-cols-2">
			<div
				class="group col-span-2 border-2 border-white bg-primary p-4 transition-colors hover:bg-blue-700 sm:p-12 md:col-span-1"
			>
				<h2 class="mb-8 flex items-center gap-2 text-2xl">
					[ WHAT YOU GET ]<span class="text-xs opacity-70 group-hover:opacity-100"
						>{loadingDots}</span
					>
				</h2>
				<ul class="space-y-4">
					<li class="flex items-start gap-3">
						<span class="text-xl text-green-400">►</span>
						<span
							>Keep earning staking rewards on supported collateral while accessing leverage</span
						>
					</li>
					<li class="flex items-start gap-3">
						<span class="text-xl text-green-300">►</span>
						<span>Trade and invest with more capital, completely liquidation-free</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="text-xl text-green-300">►</span>
						<span>Unwind positions at your pace - no forced sells, ever</span>
					</li>
					<li class="flex items-start gap-3">
						<span class="text-xl text-green-300">►</span>
						<span>Zero fees on minting or burning</span>
					</li>
				</ul>
			</div>

			<div
				class="group col-span-2 w-full border-2 border-white bg-primary p-4 transition-colors hover:bg-blue-700 sm:p-12 md:col-span-1"
			>
				<h2 class="mb-8 flex items-center gap-2 text-2xl">
					[ HOW IT WORKS ] <span class="text-xs opacity-70 group-hover:opacity-100"
						>{loadingDots}</span
					>
				</h2>
				<ul class="space-y-4">
					<li class="flex items-start gap-3">
						<LockOutline size="lg" class="mt-1 text-green-300" />
						<span>Lock your collateral (sFLR or WETH) to mint cy* tokens</span>
					</li>
					<li class="flex items-start gap-3">
						<ArrowsRepeatCountOutline size="lg" class="mt-1 text-green-300" />
						<span>Trade cy* tokens for any asset you want</span>
					</li>
					<li class="flex items-start gap-3">
						<LockOpenOutline size="lg" class="mt-1 text-green-300" />
						<span>When ready, buy cy* tokens and burn to unlock your collateral</span>
					</li>
				</ul>
			</div>
			<div class="col-span-2 flex flex-col gap-12">
				<div
					class="group mx-auto mb-8 w-full max-w-4xl border-2 border-white bg-primary p-4 transition-colors hover:bg-blue-700 sm:p-12"
				>
					<h2 class="mb-8 flex items-center gap-2 text-2xl">
						[ INTRODUCING cy* TOKENS ] <span class="text-xs opacity-70 group-hover:opacity-100"
							>installing{loadingDots}</span
						>
					</h2>
					<div class="grid gap-6 md:grid-cols-2">
						<div class="space-y-4">
							<p class="flex items-start gap-3">
								<span class="text-xl text-green-400">►</span>
								<span>New tokens backed by locked collateral</span>
							</p>
							<p class="flex items-start gap-3">
								<span class="text-xl text-green-400">►</span>
								<span>Freely tradeable in the open market</span>
							</p>
							<p class="flex items-start gap-3">
								<span class="text-xl text-green-400">►</span>
								<span>Price moves with market demand for leverage</span>
							</p>
						</div>
						<div class="space-y-4">
							<p class="flex items-start gap-3">
								<span class="text-xl text-green-400">►</span>
								<span>Natural price cycles create trading opportunities</span>
							</p>
							<p class="flex items-start gap-3">
								<span class="text-xl text-green-400">►</span>
								<span>Backed by real collateral value, not algorithmic</span>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

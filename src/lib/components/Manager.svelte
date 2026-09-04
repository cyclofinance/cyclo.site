<script lang="ts">
	/**
	 * The manager page: every lock position the wallet holds on Flare, grouped
	 * by token, best-to-close first, with Cyclo's own unlock flow one click
	 * away, and a lock panel on the same screen.
	 *
	 * Read-mostly. The only writes are Cyclo's own lock/unlock transactions,
	 * signed by the operator in their wallet.
	 */
	import { onDestroy } from 'svelte';
	import { signerAddress, web3Modal, chainId } from 'svelte-wagmi';
	import { Modal } from 'flowbite-svelte';
	import { supportedNetworks, wrongNetwork } from '$lib/stores';
	import balancesStore from '$lib/balancesStore';
	import transactionStore, { TransactionStatus } from '$lib/transactionStore';
	import type { CyToken, Receipt } from '$lib/types';
	import { fetchAllReceipts } from '$lib/queries/fetchAllReceipts';
	import { getReceiptLockDates, type LockDateMap } from '$lib/queries/getReceiptLockDates';
	import { getUnderlyingUsdPrice, getCyTokenUsdPrice } from '$lib/queries/getPositionPrices';
	import {
		buildTokenGroup,
		formatAmount,
		formatLockPrice,
		formatUsd,
		cyTokenShortfall,
		heroNetToClose,
		visibleGroups,
		LOADING_PRICES,
		type PositionRow,
		type TokenGroup,
		type TokenPrices
	} from '$lib/positions';
	import Button from './Button.svelte';
	import ReceiptModal from './ReceiptModal.svelte';
	import MintPanel from './MintPanel.svelte';

	// This manager is Flare-only: that is where the positions are, and it is the
	// only network whose explorer gives us lock dates.
	const flare = supportedNetworks.find((n) => n.key === 'flare')!;
	const tokens: CyToken[] = flare.tokens;

	let loading = false;
	let error: string | null = null;
	let receipts: Receipt[] = [];
	let lockDates: Record<string, LockDateMap> = {};
	let prices: Record<string, TokenPrices> = {};
	let loadedFor: string | null = null;
	let abort: AbortController | null = null;
	let selected: { row: PositionRow; token: CyToken } | null = null;
	let expanded: Record<string, boolean> = {};
	const nowMs = Date.now();

	const storageKey = (name: string) => `cyclo-manager.expanded.${name}`;
	const readExpanded = (name: string, fallback: boolean) => {
		try {
			const v = localStorage.getItem(storageKey(name));
			return v === null ? fallback : v === '1';
		} catch {
			return fallback;
		}
	};
	const toggle = (name: string) => {
		expanded = { ...expanded, [name]: !expanded[name] };
		try {
			localStorage.setItem(storageKey(name), expanded[name] ? '1' : '0');
		} catch {
			/* private mode etc. — expansion just does not persist */
		}
	};

	const load = async (wallet: string) => {
		abort?.abort();
		abort = new AbortController();
		const signal = abort.signal;

		loading = true;
		error = null;
		receipts = [];
		lockDates = {};
		prices = Object.fromEntries(tokens.map((t) => [t.name, LOADING_PRICES]));

		try {
			const all = await fetchAllReceipts(wallet, flare, { signal });
			if (signal.aborted) return;
			receipts = all;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			error = e instanceof Error ? e.message : String(e);
			loading = false;
			return;
		}
		loading = false;

		// Best-effort detail, per token, in parallel. Each result lands on its own.
		for (const token of tokens) {
			const held = receipts.filter((r) => r.token === token.name);
			if (held.length > 0) {
				getReceiptLockDates(wallet, token.receiptAddress, flare, { signal })
					.then((m) => {
						if (!signal.aborted) lockDates = { ...lockDates, [token.name]: m };
					})
					.catch((e) => console.error(`lock dates (${token.name}) failed:`, e));
			}
			Promise.all([getUnderlyingUsdPrice(token), getCyTokenUsdPrice(token)]).then(
				([underlyingUsdNow, cyTokenUsdNow]) => {
					if (signal.aborted) return;
					prices = { ...prices, [token.name]: { underlyingUsdNow, cyTokenUsdNow, settled: true } };
				}
			);
		}
	};

	$: if ($signerAddress && $signerAddress !== loadedFor) {
		loadedFor = $signerAddress;
		load($signerAddress);
	}
	$: if (!$signerAddress && loadedFor) {
		loadedFor = null;
		abort?.abort();
		receipts = [];
		error = null;
		loading = false;
	}

	// A confirmed lock or unlock changes the receipts: reload from the source.
	let lastTxStatus = $transactionStore.status;
	$: if ($transactionStore.status !== lastTxStatus) {
		lastTxStatus = $transactionStore.status;
		if (lastTxStatus === TransactionStatus.SUCCESS && $signerAddress) {
			selected = null;
			load($signerAddress);
		}
	}

	$: groups = tokens.map((token) =>
		buildTokenGroup({
			token,
			receipts: receipts.filter((r) => r.token === token.name),
			lockDates: lockDates[token.name] ?? new Map(),
			prices: prices[token.name] ?? LOADING_PRICES,
			nowMs
		})
	);
	$: shown = visibleGroups(groups);
	$: hiddenWithPositions = groups.filter((g) => g.hidden && g.count > 0);
	$: hero = heroNetToClose(groups);
	$: mintable = groups.filter((g) => !g.hidden).map((g) => g.token);
	$: for (const g of shown) {
		if (!(g.token.name in expanded)) {
			expanded = { ...expanded, [g.token.name]: readExpanded(g.token.name, g.count <= 25) };
		}
	}
	$: onFlare = $chainId === flare.chain.id;

	onDestroy(() => abort?.abort());
</script>

<div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 p-4 text-ink sm:p-6">
	{#if !$signerAddress}
		<div class="flex flex-col items-center gap-4 py-24">
			<Button on:click={() => $web3Modal.open()} dataTestId="connect" customClass="text-xl">
				Connect wallet
			</Button>
		</div>
	{:else if !onFlare || $wrongNetwork}
		<div class="flex flex-col items-center gap-4 py-24">
			<Button on:click={() => $web3Modal.open()} dataTestId="switch-network" customClass="text-xl">
				Switch wallet to Flare
			</Button>
		</div>
	{:else}
		<!-- The one number this page exists for. -->
		<div class="flex flex-col gap-1 border-4 border-line bg-primary p-4" data-testid="hero">
			<span class="text-sm text-dim">Net to close all positions</span>
			<span
				class="text-4xl font-bold sm:text-5xl {hero === null
					? 'text-dim'
					: hero < 0n
						? 'text-loss'
						: 'text-gain'}"
				data-testid="hero-net-to-close"
			>
				{formatUsd(hero)}
			</span>
		</div>

		{#if loading}
			<p class="text-center text-lg" data-testid="loading">Loading positions…</p>
		{:else if error}
			<div class="border-4 border-loss p-4 text-loss" data-testid="error">
				<p class="font-bold">Could not load positions.</p>
				<p class="text-sm">{error}</p>
			</div>
		{:else if shown.length === 0 && hiddenWithPositions.length === 0}
			<p class="text-center text-lg text-dim" data-testid="empty">No lock positions.</p>
		{/if}

		{#each shown as group (group.token.name)}
			{@const wallet = $balancesStore.balances[group.token.name]?.signerBalance ?? 0n}
			{@const short = cyTokenShortfall(group.mintedCyToken, wallet)}
			<section class="border-4 border-line bg-primary" data-testid="group-{group.token.name}">
				<!-- Sticks to the top while you scroll this token's rows, so the numbers
				     that explain the rows are always in view. -->
				<div class="sticky top-0 z-10 border-b-2 border-line bg-primary">
					<button
						class="flex w-full flex-col gap-3 p-4 text-left"
						on:click={() => toggle(group.token.name)}
						data-testid="group-toggle-{group.token.name}"
					>
						<span class="flex w-full items-baseline justify-between">
							<span class="text-xl font-bold">
								{group.token.underlyingSymbol}
								<span class="text-base font-normal text-dim">
									· {group.count} position{group.count === 1 ? '' : 's'}
								</span>
							</span>
							<span class="text-dim">{expanded[group.token.name] ? '▴' : '▾'}</span>
						</span>
						<span
							class="grid w-full grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4 sm:text-base"
							data-testid="group-summary-{group.token.name}"
						>
							<span class="flex flex-col">
								<span class="text-xs text-dim">{group.token.name} in wallet</span>
								<span>{formatAmount(wallet, group.token.decimals)}</span>
							</span>
							<span class="flex flex-col">
								<span class="text-xs text-dim">{group.token.name} to unlock all</span>
								<span>
									{formatAmount(group.mintedCyToken, group.token.decimals)}
									{#if short > 0n}
										<span class="text-dim" data-testid="group-short-{group.token.name}">
											· short {formatAmount(short, group.token.decimals)}
										</span>
									{/if}
								</span>
							</span>
							<span class="flex flex-col">
								<span class="text-xs text-dim">{group.token.underlyingSymbol} locked</span>
								<span>
									{formatAmount(group.lockedUnderlying, group.token.decimals)}
									<span class="text-dim">
										· worth {formatUsd(group.collateralValueUsd).replace('+', '')}
									</span>
								</span>
							</span>
							<span class="flex flex-col">
								<span class="text-xs text-dim">Net to close</span>
								<span
									class="font-bold {group.netToCloseUsd === null
										? 'text-dim'
										: group.netToCloseUsd < 0n
											? 'text-loss'
											: 'text-gain'}"
									data-testid="group-net-{group.token.name}"
								>
									{formatUsd(group.netToCloseUsd)}
								</span>
							</span>
						</span>
					</button>
					{#if expanded[group.token.name]}
						<div
							class="grid grid-cols-[1.2fr_1.2fr_0.7fr_1fr_auto] gap-x-4 border-t border-line/60 px-4 py-2 text-xs text-dim sm:text-sm"
						>
							<span>Locked</span>
							<span>Price at lock</span>
							<span>Held</span>
							<span>Net to close</span>
							<span class="sr-only">Unlock</span>
						</div>
					{/if}
				</div>

				{#if expanded[group.token.name]}
					<div data-testid="rows-{group.token.name}">
						{#each group.rows as row, i (row.receipt.tokenId)}
							<div
								class="grid grid-cols-[1.2fr_1.2fr_0.7fr_1fr_auto] items-center gap-x-4 border-t border-line/40 px-4 py-2 text-sm sm:text-base"
								data-testid="row-{group.token.name}-{i}"
							>
								<span>{formatAmount(row.underlyingAmount, group.token.decimals)}</span>
								<span>${formatLockPrice(row.lockPriceUsd)}</span>
								<span>{row.held === null ? '—' : `${row.held}d`}</span>
								<span
									class="font-bold {row.netToCloseUsd === null
										? 'text-dim'
										: row.netToCloseUsd < 0n
											? 'text-loss'
											: 'text-gain'}"
								>
									{formatUsd(row.netToCloseUsd)}
								</span>
								<button
									class="border-2 border-line px-3 py-1 font-bold hover:brightness-125"
									on:click={() => (selected = { row, token: group.token })}
									data-testid="unlock-{group.token.name}-{i}"
								>
									Unlock
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/each}

		{#each hiddenWithPositions as group (group.token.name)}
			<p class="text-sm text-dim" data-testid="hidden-{group.token.name}">
				{group.token.name}: {group.count} position{group.count === 1 ? '' : 's'} hidden — no market for
				{group.token.name} yet.
			</p>
		{/each}

		{#if mintable.length > 0}
			<MintPanel tokens={mintable} />
		{/if}
	{/if}
</div>

{#if selected}
	<Modal
		outsideclose={true}
		dismissable={true}
		on:close={() => (selected = null)}
		defaultClass="bg-primary border-4 rounded-none inset h-fit"
		open={true}
	>
		<ReceiptModal receipt={selected.row.receipt} token={selected.token} />
	</Modal>
{/if}

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
	import { getReceiptLockInfo, type LockInfoMap } from '$lib/queries/getReceiptLockDates';
	import { getCyTokenUsdAtBlocks } from '$lib/queries/cyTokenPriceAtLock';
	import { getUnderlyingUsdPrice, getCyTokenUsdPrice } from '$lib/queries/getPositionPrices';
	import {
		buildTokenGroup,
		formatAmount,
		formatLockPrice,
		formatPct,
		formatUsd,
		sortRows,
		nextSort,
		DEFAULT_SORT,
		LOADING_PRICES,
		type PositionRow,
		type SortKey,
		type SortSpec,
		type TokenPrices
	} from '$lib/positions';
	import { env } from '$env/dynamic/public';
	import Button from './Button.svelte';
	import ReceiptModal from './ReceiptModal.svelte';
	import MintPanel from './MintPanel.svelte';
	import PositionCard from './PositionCard.svelte';

	const cards = env.PUBLIC_THEME === 'apex';

	// This manager is Flare-only: that is where the positions are, and it is the
	// only network whose explorer gives us lock dates.
	const flare = supportedNetworks.find((n) => n.key === 'flare')!;
	const tokens: CyToken[] = flare.tokens;

	let loading = false;
	let error: string | null = null;
	let receipts: Receipt[] = [];
	let lockInfo: Record<string, LockInfoMap> = {};
	let cyAtLock: Record<string, Map<string, bigint | null>> = {};
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

	// Column order, one choice for the whole page, remembered per browser.
	const SORT_KEY = 'cyclo-manager.sort';
	const readSort = (): SortSpec => {
		try {
			const v = JSON.parse(localStorage.getItem(SORT_KEY) ?? 'null');
			if (
				v &&
				['locked', 'lockPrice', 'held', 'net'].includes(v.key) &&
				['asc', 'desc'].includes(v.dir)
			)
				return v;
		} catch {
			/* fall through */
		}
		return DEFAULT_SORT;
	};
	let sort: SortSpec = readSort();
	const sortBy = (key: SortKey) => {
		sort = nextSort(sort, key);
		try {
			localStorage.setItem(SORT_KEY, JSON.stringify(sort));
		} catch {
			/* private mode etc. */
		}
	};
	const columns: { key: SortKey; label: string }[] = [
		{ key: 'locked', label: 'Locked' },
		{ key: 'lockPrice', label: 'Price at lock' },
		{ key: 'held', label: 'Held' },
		{ key: 'net', label: 'Net to close' },
		{ key: 'pct', label: '% up' }
	];
	// One grid for the column headers AND the rows, so they can never drift
	// apart: the Unlock column is a fixed width, not "whatever the button needs".
	const ROW_GRID = 'grid-cols-[1fr_1fr_0.7fr_1fr_0.8fr_6.5rem]';
	const arrow = (key: SortKey, s: SortSpec) => (s.key !== key ? '' : s.dir === 'asc' ? '▲' : '▼');

	// ONE product on screen at a time, chosen from the dropdown. Remembered per
	// browser; on a fresh browser we open on whichever product holds the most
	// positions.
	const PRODUCT_KEY = 'cyclo-manager.product';
	const readProduct = (): string | null => {
		try {
			return localStorage.getItem(PRODUCT_KEY);
		} catch {
			return null;
		}
	};
	let selectedName: string = readProduct() ?? tokens[0].name;
	let autoPicked = readProduct() !== null;
	const pickProduct = (name: string) => {
		selectedName = name;
		autoPicked = true;
		try {
			localStorage.setItem(PRODUCT_KEY, name);
		} catch {
			/* private mode etc. */
		}
	};

	const load = async (wallet: string) => {
		abort?.abort();
		abort = new AbortController();
		const signal = abort.signal;

		loading = true;
		error = null;
		receipts = [];
		lockInfo = {};
		cyAtLock = {};
		prices = Object.fromEntries(tokens.map((t) => [t.name, LOADING_PRICES]));

		try {
			const all = await fetchAllReceipts(wallet, flare, { signal });
			if (signal.aborted) return;
			receipts = all;
			if (!autoPicked) {
				const counts = tokens.map(
					(t) => [t.name, all.filter((r) => r.token === t.name).length] as const
				);
				const busiest = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
				if (busiest[1] > 0) selectedName = busiest[0];
				autoPicked = true;
			}
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
				getReceiptLockInfo(wallet, token.receiptAddress, flare, { signal })
					.then(async (info) => {
						if (signal.aborted) return;
						lockInfo = { ...lockInfo, [token.name]: info };
						// What the cyToken was worth at each lock block — one quote per
						// distinct block, cached for good once known.
						const blocks = [...info.values()]
							.map((v) => v.blockNumber)
							.filter((b): b is number => b !== null);
						const byBlock = await getCyTokenUsdAtBlocks(token, blocks, { signal });
						if (signal.aborted) return;
						const byTokenId = new Map<string, bigint | null>();
						for (const [id, v] of info) {
							byTokenId.set(id, v.blockNumber === null ? null : byBlock.get(v.blockNumber) ?? null);
						}
						cyAtLock = { ...cyAtLock, [token.name]: byTokenId };
					})
					.catch((e) => console.error(`lock info (${token.name}) failed:`, e));
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
			lockDates: new Map(
				[...(lockInfo[token.name] ?? new Map())].map(([id, v]) => [id, v.lockedAtMs])
			),
			prices: prices[token.name] ?? LOADING_PRICES,
			nowMs,
			cyTokenAtLock: cyAtLock[token.name]
		})
	);
	$: current = groups.find((g) => g.token.name === selectedName) ?? groups[0];
	$: shown = current && !current.hidden && current.count > 0 ? [current] : [];
	$: hiddenWithPositions = current && current.hidden && current.count > 0 ? [current] : [];
	$: hero = current?.netToCloseUsd ?? null;
	$: mintable = current && !current.hidden ? [current.token] : [];
	$: for (const g of shown) {
		if (!(g.token.name in expanded)) {
			expanded = { ...expanded, [g.token.name]: readExpanded(g.token.name, true) };
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
		<!-- Which product. One at a time, never blended. -->
		<label class="flex items-center gap-3 text-sm text-dim">
			Product
			<select
				class="border-frame border-line bg-primary px-4 py-2 text-lg font-bold text-ink"
				value={selectedName}
				on:change={(e) => pickProduct(e.currentTarget.value)}
				data-testid="product-select"
			>
				{#each groups as g (g.token.name)}
					<option value={g.token.name}>
						{g.token.underlyingSymbol} · {g.count} position{g.count === 1 ? '' : 's'}
					</option>
				{/each}
			</select>
		</label>

		<!-- Top row: the one number this page exists for, and the way to add to it. -->
		<div
			class="grid gap-6 {mintable.length > 0 ? 'lg:grid-cols-[1fr_1.4fr]' : ''}"
			data-testid="top-row"
		>
			<div
				class="flex flex-col justify-center gap-1 border-frame border-line bg-primary p-5 sm:p-6"
				data-testid="hero"
			>
				<span class="text-sm text-dim">
					Net to close all {current?.token.underlyingSymbol ?? ''} positions
				</span>
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
			{#if mintable.length > 0}
				<MintPanel tokens={mintable} />
			{/if}
		</div>

		{#if loading}
			<p class="text-center text-lg" data-testid="loading">Loading positions…</p>
		{:else if error}
			<div class="border-frame border-loss p-4 text-loss" data-testid="error">
				<p class="font-bold">Could not load positions.</p>
				<p class="text-sm">{error}</p>
			</div>
		{:else if shown.length === 0 && hiddenWithPositions.length === 0}
			<p class="text-center text-lg text-dim" data-testid="empty">
				No {current?.token.underlyingSymbol ?? ''} lock positions.
			</p>
		{/if}

		{#each shown as group (group.token.name)}
			{@const wallet = $balancesStore.balances[group.token.name]?.signerBalance ?? 0n}
			<section class="border-frame border-line bg-primary" data-testid="group-{group.token.name}">
				<!-- Sticks to the top while you scroll this token's rows, so the numbers
				     that explain the rows are always in view. -->
				<div class="sticky top-0 z-10 border-b-2 border-line bg-primary">
					<button
						class="flex w-full flex-col gap-5 p-5 text-left sm:p-6"
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
							class="grid w-full grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4"
							data-testid="group-summary-{group.token.name}"
						>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">{group.token.name} in wallet</span>
								<span class="text-base sm:text-lg"
									>{formatAmount(wallet, group.token.decimals)}</span
								>
							</span>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">{group.token.name} to unlock all</span>
								<span class="text-base sm:text-lg">
									{formatAmount(group.mintedCyToken, group.token.decimals)}
								</span>
							</span>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">{group.token.name} price now</span>
								<span class="text-base sm:text-lg" data-testid="group-cyprice-{group.token.name}">
									{group.cyTokenUsdNow === null ? '—' : `$${formatLockPrice(group.cyTokenUsdNow)}`}
								</span>
							</span>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">Cash to unlock all</span>
								<span
									class="text-base sm:text-lg"
									data-testid="group-unlock-cash-{group.token.name}"
								>
									{formatUsd(group.cyTokenRepayUsd).replace('+', '')}
								</span>
							</span>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">{group.token.underlyingSymbol} price now</span>
								<span class="text-base sm:text-lg" data-testid="group-price-{group.token.name}">
									{group.rows[0]?.underlyingUsdNow == null
										? '—'
										: `$${formatLockPrice(group.rows[0].underlyingUsdNow)}`}
								</span>
							</span>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">{group.token.underlyingSymbol} locked</span>
								<span class="text-base sm:text-lg">
									{formatAmount(group.lockedUnderlying, group.token.decimals)}
									<span class="text-sm text-dim"
										>· worth {formatUsd(group.collateralValueUsd).replace('+', '')}</span
									>
								</span>
							</span>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">Less than at lock</span>
								<span class="text-base sm:text-lg" data-testid="group-payoff-{group.token.name}">
									{group.payoffSavedUsd === null
										? '—'
										: group.payoffSavedUsd >= 0n
											? formatUsd(group.payoffSavedUsd).replace('+', '')
											: `−${formatUsd(-group.payoffSavedUsd).replace('+', '')} more`}
								</span>
							</span>
							<span class="flex flex-col gap-1">
								<span class="text-xs text-dim">Net to close</span>
								<span
									class="text-base font-bold sm:text-lg {group.netToCloseUsd === null
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
					{#if expanded[group.token.name] && !cards}
						<div
							class="border-line/60 grid {ROW_GRID} items-center gap-x-6 border-t px-5 py-3 text-xs text-dim sm:px-6 sm:text-sm"
							data-testid="columns-{group.token.name}"
						>
							{#each columns as col (col.key)}
								<button
									class="flex items-center gap-1 text-left hover:text-ink {sort.key === col.key
										? 'text-ink'
										: ''}"
									on:click|stopPropagation={() => sortBy(col.key)}
									aria-pressed={sort.key === col.key}
									data-testid="sort-{col.key}"
								>
									{col.label}
									<span class="text-[0.7em]">{arrow(col.key, sort)}</span>
								</button>
							{/each}
							<span class="sr-only">Unlock</span>
						</div>
					{:else if expanded[group.token.name]}
						<div
							class="border-line/60 flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-5 py-3 text-xs text-dim sm:px-6 sm:text-sm"
							data-testid="columns-{group.token.name}"
						>
							<span>Sort by</span>
							{#each columns as col (col.key)}
								<button
									class="flex items-center gap-1 hover:text-ink {sort.key === col.key
										? 'text-ink'
										: ''}"
									on:click|stopPropagation={() => sortBy(col.key)}
									data-testid="sort-{col.key}"
								>
									{col.label}
									<span class="text-[0.7em]">{arrow(col.key, sort)}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				{#if expanded[group.token.name] && cards}
					<div
						class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3"
						data-testid="cards-{group.token.name}"
					>
						{#each sortRows(group.rows, sort) as row (row.receipt.tokenId)}
							<PositionCard
								{row}
								token={group.token}
								onUnlock={() => (selected = { row, token: group.token })}
							/>
						{/each}
					</div>
				{:else if expanded[group.token.name]}
					<div data-testid="rows-{group.token.name}">
						{#each sortRows(group.rows, sort) as row, i (row.receipt.tokenId)}
							{@const tone =
								row.netToCloseUsd === null
									? 'text-dim'
									: row.netToCloseUsd < 0n
										? 'text-loss'
										: 'text-gain'}
							<div
								class="border-line/40 grid {ROW_GRID} items-center gap-x-6 border-t px-5 py-4 text-base sm:px-6 sm:text-lg"
								data-testid="row-{group.token.name}-{i}"
							>
								<span>{formatAmount(row.underlyingAmount, group.token.decimals)}</span>
								<span>${formatLockPrice(row.lockPriceUsd)}</span>
								<span>{row.held === null ? '—' : `${row.held}d`}</span>
								<span class="font-bold {tone}">{formatUsd(row.netToCloseUsd)}</span>
								<span class="font-bold {tone}" data-testid="row-pct">{formatPct(row.pnlPct)}</span>
								<button
									class="w-full border-frame border-line py-1.5 text-base font-bold hover:brightness-125"
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
	{/if}
</div>

{#if selected}
	<Modal
		outsideclose={true}
		dismissable={true}
		on:close={() => (selected = null)}
		defaultClass="bg-primary border-frame rounded-card inset h-fit"
		open={true}
	>
		<ReceiptModal receipt={selected.row.receipt} token={selected.token} />
	</Modal>
{/if}

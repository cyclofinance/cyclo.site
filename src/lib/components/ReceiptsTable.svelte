<script lang="ts">
	import {
		Table,
		TableBody,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		TableBodyCell,
		Modal,
		Button
	} from 'flowbite-svelte';
	import type { CyToken, Receipt as ReceiptType } from '$lib/types';
	import { formatUnits } from 'viem';
	import { computePositionMetrics, daysHeld, sumOrNull } from '$lib/positionMath';
	import type { LockDateMap } from '$lib/queries/getReceiptLockDates';

	import ReceiptModal from '$lib/components/ReceiptModal.svelte';
	import Card from './Card.svelte';

	export let token: CyToken;
	export let receipts: ReceiptType[];

	/** tokenId -> epoch ms of the lock. Empty when the explorer has no feed (non-Flare). */
	export let lockDates: LockDateMap = new Map();
	/** 18-dec USD price of the locked asset now, from the vault oracle. Null = unknown. */
	export let underlyingUsdNow: bigint | null = null;
	/** 18-dec USD market price of one cyToken. Null = no live pool. */
	export let cyTokenUsdNow: bigint | null = null;

	let selectedReceipt: ReceiptType | null = null;

	const nowMs = Date.now();

	$: showPnl = underlyingUsdNow !== null || cyTokenUsdNow !== null;
	$: showHeld = lockDates.size > 0;

	$: mappedReceipts = [...receipts]
		.map((receipt) => {
			// Guard against undefined values
			if (!receipt.balance || !receipt.tokenId) {
				return {
					...receipt,
					totalsFlr: BigInt(0),
					lockPrice: 0,
					readableFlrPerReceipt: '0.00000',
					readableTotalsFlr: '0.00000',
					held: null as number | null,
					collateralPnlUsd: null as bigint | null,
					cyTokenPnlUsd: null as bigint | null,
					netToCloseUsd: null as bigint | null
				};
			}

			const balance = BigInt(receipt.balance);
			const tokenId = BigInt(receipt.tokenId);

			// Calculate totals: (balance * 10^18) / tokenId
			const totalsFlr = (balance * 10n ** 18n) / tokenId;

			// Calculate per-receipt: 10^36 / tokenId
			const flrPerReceipt = 10n ** 36n / tokenId;

			// Lock price = tokenId in 18 decimals — the value displayed as
			// "{token.name} per locked {token.underlyingSymbol}"
			const lockPrice = Number(formatUnits(tokenId, 18));

			const metrics = computePositionMetrics({
				balance,
				tokenId,
				decimals: token.decimals,
				underlyingUsdNow,
				cyTokenUsdNow
			});

			return {
				...receipt,
				totalsFlr,
				lockPrice,
				readableFlrPerReceipt: Number(formatUnits(flrPerReceipt, token.decimals)).toFixed(5),
				readableTotalsFlr: Number(formatUnits(totalsFlr, token.decimals)).toFixed(5),
				held: daysHeld(lockDates.get(receipt.tokenId), nowMs),
				collateralPnlUsd: metrics.collateralPnlUsd,
				cyTokenPnlUsd: metrics.cyTokenPnlUsd,
				netToCloseUsd: metrics.netToCloseUsd
			};
		})
		.sort((a, b) => a.lockPrice - b.lockPrice);

	$: totalCollateralPnl = sumOrNull(mappedReceipts.map((r) => r.collateralPnlUsd));
	$: totalCyTokenPnl = sumOrNull(mappedReceipts.map((r) => r.cyTokenPnlUsd));
	$: totalNetToClose = sumOrNull(mappedReceipts.map((r) => r.netToCloseUsd));

	const formatUsd = (value: bigint | null): string => {
		if (value === null) return '—';
		const n = Number(formatUnits(value, 18));
		const sign = n > 0 ? '+' : n < 0 ? '−' : '';
		return `${sign}$${Math.abs(n).toFixed(Math.abs(n) < 1 ? 4 : 2)}`;
	};

	const pnlClass = (value: bigint | null): string =>
		value === null ? 'text-gray-400' : value > 0n ? 'text-green-400' : value < 0n ? 'text-red-400' : '';
</script>

<Card size="lg">
	<div class="w-full overflow-x-auto">
		<Table divClass="w-full" data-testid="receipts-table">
			<TableHead
				class="bg-opacity-0 bg-none p-1 text-white md:p-4 [&_th]:px-2 [&_th]:md:px-6"
				data-testid="headers"
			>
				<TableHeadCell>Total {token.underlyingSymbol} Locked</TableHeadCell>
				<TableHeadCell>Total {token.name} minted</TableHeadCell>
				<TableHeadCell>{token.name} per locked {token.underlyingSymbol}</TableHeadCell>
				{#if showHeld}
					<TableHeadCell>Held</TableHeadCell>
				{/if}
				{#if showPnl}
					<TableHeadCell title="Locked {token.underlyingSymbol} value now vs at lock"
						>{token.underlyingSymbol} P&L</TableHeadCell
					>
					<TableHeadCell title="Discount on the {token.name} you must return to unlock"
						>{token.name} P&L</TableHeadCell
					>
					<TableHeadCell title="Collateral recovered minus the cost of buying back {token.name}"
						>Net to close</TableHeadCell
					>
				{/if}
				<TableHeadCell><span class="sr-only">Unlock</span></TableHeadCell>
			</TableHead>
			<TableBody
				tableBodyClass="bg-opacity-0 [&_td]:text-white p-1 [&_td]:text-left [&_td]:px-2 [&_td]:md:px-6"
			>
				{#each mappedReceipts as receipt, index}
					<TableBodyRow class="bg-opacity-0 " data-testid={`receipt-row-${index}`}>
						<TableBodyCell class="" data-testid={`total-locked-${index}`}>
							{receipt.readableTotalsFlr}
						</TableBodyCell>
						<TableBodyCell data-testid={`number-held-${index}`}>
							{Number(formatUnits(receipt.balance, token.decimals)).toFixed(5)}
						</TableBodyCell>
						<TableBodyCell data-testid={`locked-price-${index}`}>
							{Number(formatUnits(BigInt(receipt.tokenId), 18)).toFixed(5)}
						</TableBodyCell>
						{#if showHeld}
							<TableBodyCell data-testid={`days-held-${index}`}>
								{receipt.held === null ? '—' : `${receipt.held}d`}
							</TableBodyCell>
						{/if}
						{#if showPnl}
							<TableBodyCell
								data-testid={`collateral-pnl-${index}`}
								class={pnlClass(receipt.collateralPnlUsd)}
							>
								{formatUsd(receipt.collateralPnlUsd)}
							</TableBodyCell>
							<TableBodyCell
								data-testid={`cytoken-pnl-${index}`}
								class={pnlClass(receipt.cyTokenPnlUsd)}
							>
								{formatUsd(receipt.cyTokenPnlUsd)}
							</TableBodyCell>
							<TableBodyCell
								data-testid={`net-to-close-${index}`}
								class="font-bold {pnlClass(receipt.netToCloseUsd)}"
							>
								{formatUsd(receipt.netToCloseUsd)}
							</TableBodyCell>
						{/if}
						<TableBodyCell class="">
							<Button
								class="flex items-center justify-center rounded-none border-2 border-white bg-primary px-2 py-1 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-neutral-600"
								data-testid={`redeem-button-${index}`}
								on:click={() => (selectedReceipt = receipt)}>Unlock</Button
							>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
				{#if showPnl && mappedReceipts.length > 1}
					<TableBodyRow class="border-t-2 border-white bg-opacity-0" data-testid="totals-row">
						<TableBodyCell class="font-bold">Total</TableBodyCell>
						<TableBodyCell />
						<TableBodyCell />
						{#if showHeld}
							<TableBodyCell />
						{/if}
						<TableBodyCell class="font-bold {pnlClass(totalCollateralPnl)}" data-testid="total-collateral-pnl">
							{formatUsd(totalCollateralPnl)}
						</TableBodyCell>
						<TableBodyCell class="font-bold {pnlClass(totalCyTokenPnl)}" data-testid="total-cytoken-pnl">
							{formatUsd(totalCyTokenPnl)}
						</TableBodyCell>
						<TableBodyCell class="font-bold {pnlClass(totalNetToClose)}" data-testid="total-net-to-close">
							{formatUsd(totalNetToClose)}
						</TableBodyCell>
						<TableBodyCell />
					</TableBodyRow>
				{/if}
			</TableBody>
		</Table>
	</div>
	{#if showPnl && cyTokenUsdNow === null}
		<p class="mt-2 px-2 text-sm text-gray-300" data-testid="cytoken-price-unavailable">
			No live {token.name} pool — {token.name} P&L and net-to-close unavailable.
		</p>
	{/if}
</Card>

{#if selectedReceipt}
	<Modal
		outsideclose={true}
		dismissable={true}
		on:close={() => (selectedReceipt = null)}
		defaultClass="bg-primary border-4 rounded-none inset h-fit"
		open={selectedReceipt ? true : false}
	>
		<ReceiptModal receipt={selectedReceipt} {token} />
	</Modal>
{/if}

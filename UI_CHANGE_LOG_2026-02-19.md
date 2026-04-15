# Cyclo Finance — UI Patch Log

**Date:** 2026-02-19
**Scope:** UI-only corrections
**Author:** Steven Hudspeth
**Environment Tested:** Local dev + static preview build

---

## Summary

This patch contains strictly presentation-layer improvements.
No contract logic, store logic, polling, or data pipelines were modified.

Changes fall into three categories:

1. Unlock list sorting correction
2. Token panel filtering on Unlock page + Footer
3. Balance card labeling clarity improvement

---

## 1. Unlock List Sorting Fix

### File

`src/lib/components/ReceiptsTable.svelte`

### Issue

Unlock positions were not ordered by lock price.

### Expected Behavior

Positions sorted ascending by lock price (cyToken per locked underlying).
Lowest lock price at top. Highest at bottom.

### Implementation

- Changed `mappedReceipts` from a one-time `const` to a reactive `$:` derived array.
- Added `lockPrice` field computed from `tokenId` (formatted to 18 decimals).
- Appended `.sort((a, b) => a.lockPrice - b.lockPrice)` to the mapped array.
- Sorting occurs on a spread copy (`[...receipts]`).
- Original `receipts` prop is not mutated.
- Pure presentation-layer change.

### Risk Level

Low — no store or contract modifications.

---

## 2. Token Panel Filtering (Unlock + Footer)

### Files

- `src/lib/components/Unlock.svelte`
- `src/lib/components/Footer.svelte`

### Issue

All tokens across networks rendered in panels regardless of selected token.

### Fix — Unlock.svelte

Restricted wallet balance rendering to selected token only:

```svelte
{#each $allTokens.filter((t) => t.name === $selectedCyToken?.name) as token}
```

### Fix — Footer.svelte

Imported `selectedCyToken` from stores. Created reactive `filteredTokensByNetwork` that filters each network's tokens array to only the selected token, removing networks with zero matching tokens. Replaced `tokensByNetwork` with `filteredTokensByNetwork` in the template loop.

### Impact

- Cleaner UX — only relevant token panel shown
- Reduced cognitive noise
- No store modification
- No change to data fetching

### Risk Level

Low — template-only filtering.

---

## 3. Wallet Balance Label Clarification

### File

`src/lib/components/Unlock.svelte`

### Change

Renamed:

```
BALANCES
```

to:

```
WALLET BALANCE
```

Added helper text:

```
cyToken balance in your wallet. Locked positions are listed below.
```

### Purpose

Clarifies distinction between:

- Wallet-held ERC20 balance
- Locked positions (receipt NFTs)

### Risk Level

Minimal — text-only modification.

---

## Scope Confirmation

| Area                  | Modified |
| --------------------- | -------- |
| Store logic           | No       |
| Contract interactions | No       |
| Polling intervals     | No       |
| Generated files       | No       |
| Root layout           | No       |
| balancesStore.ts      | No       |
| transactionStore.ts   | No       |
| UI components only    | Yes      |

---

## Files Modified

| File | Lines Changed |
| ---- | ------------- |
| `src/lib/components/ReceiptsTable.svelte` | +41 / -26 |
| `src/lib/components/Unlock.svelte` | +5 / -2 |
| `src/lib/components/Footer.svelte` | +12 / -2 |

---

## Testing Performed

- Local dev server (`npm run dev`)
- Static preview (`npm run build` + `npm run preview`)
- Verified:
  - Unlock sorting correct
  - Token filtering correct on Unlock page and Footer
  - No console errors
  - No hydration issues
  - No network polling regression

---

End of patch log.

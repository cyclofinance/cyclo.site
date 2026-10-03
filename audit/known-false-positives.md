# Known false positives

Findings that audit passes repeatedly surface but that are not bugs. Each
entry records the claim, why it is a false positive, and where it was
resolved, so future passes skip re-deriving and re-filing it.

Per-pass findings logs also live in this directory (`pass<N>-findings.md`)
when an audit pass runs against this repo; the canonical tracker for open
findings is GitHub issues labeled `audit` (see CLAUDE.md, "Audit history").

Format per entry:

## <short claim>

- **Where:** `<file:line / component>`
- **Why it is not a bug:** <one-paragraph derivation from the actual code>
- **Resolved:** <issue link closed as invalid, with date>

No entries yet.

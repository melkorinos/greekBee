# ADR 0011 — Nominations retention: rejected rows kept forever; accepted rows deleted 30 days after apply

**Status**: Accepted

## Context

The `nominations` table accumulates rows over time. Three statuses exist: `pending`, `accepted`, `rejected`. The question is which rows to clean up and when.

`reviewed_at` already has a dual meaning established by the apply CLI (`scripts/apply-nominations.ts`; it was `apply-nominations.mjs` when this was written — ADR 0015 converted it to TypeScript): when an admin approves a Nomination the column stays `null`; the CLI script sets `reviewed_at = now()` after patching the word-list files. So `reviewed_at IS NULL` on an accepted row means "applied pending" and `IS NOT NULL` means "applied".

## Decision

- **`pending`** — never deleted (awaiting admin review).
- **`rejected`** — never deleted. `NominationModal` queries `/api/nominations/lookup` on open and warns the player when a prior rejection exists for the same word + direction, making the explanation note mandatory before re-submission. Deleting rejected rows would silently remove that guardrail.
- **`accepted`** — deleted 30 days after `reviewed_at` is set (i.e. after the word has been live for at least 30 days). The row has no runtime function at that point.

Cleanup runs in the existing daily Vercel Cron at `/api/cleanup-scores`. No new endpoint is needed.

## Reasons

- A separate `applied_at` column was considered but `reviewed_at` already carries the same semantics — adding a second column would be redundant.
- 30 days is long enough to catch any audit need and is safely beyond any plausible deploy lag.
- Rejected rows must outlive any future re-submission by the same or a different player, so the only safe policy is permanent retention.

## Consequences

- `nomination_votes` cascade-deletes when its parent Nomination is deleted (FK `ON DELETE CASCADE`) — vote history on applied Nominations is intentionally discarded.
- `player_profiles` cleanup remains unimplemented; deferred until there is enough usage data to set a meaningful inactivity threshold.

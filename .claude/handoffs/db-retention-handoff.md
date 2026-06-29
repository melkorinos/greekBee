# Handoff: DB Retention Policy — Two Deferred Tasks

**Date**: 2026-06-29  
**Repo**: `c:\repos\try` (greekBee / Leksarxeia platform)  
**Branch**: `dev`

---

## What was done this session

### Cron cleanup was broken — now fixed

The existing Vercel cron at `/api/cleanup-scores` (GET, Edge runtime) had **never run successfully**. Root cause: `CRON_SECRET` was not set in Vercel environment variables, so every invocation returned 401.

**Fixed:**
- `CRON_SECRET` set in Vercel project env vars (Production scope) and added to `.env.local`
- Endpoint triggered manually — deleted 83 `game_scores`, 40 `game_state`, 8 `transfer_codes` rows
- DB confirmed clean: oldest `game_scores` row is now 2026-06-19 (within the 10-day window)
- Guardrail added: route now returns 500 if `SCORE_RETENTION_DAYS <= LEADERBOARD_WINDOW_DAYS`, so lowering the retention window below the leaderboard window is impossible at runtime

**Relevant files:**
- [src/app/api/cleanup-scores/route.ts](src/app/api/cleanup-scores/route.ts) — the cron route
- [src/config/retention.ts](src/config/retention.ts) — `SCORE_RETENTION_DAYS = 10`, `LEADERBOARD_WINDOW_DAYS = 7`
- [vercel.json](vercel.json) — cron at `0 3 * * *` → `/api/cleanup-scores`

---

## Two deferred retention tasks

Issue 08 (`.claude/issue-tracker/issues/08-scheduled-stale-row-cleanup.md`) has been deleted — its remaining work is tracked here.

### 1. `player_profiles` — deferred, keep ≥ 100 days

**Decision**: No cleanup yet. Owner wants at least 100 days before any deletion runs.

**When to revisit**: When the platform has more usage data and the 100-day threshold is confirmed.

**Implementation when ready**: extend the cleanup route with:
```ts
supabase.from("player_profiles").delete().lt("last_active", cutoffFor(100))
```

### 2. `nominations` — deferred, design incomplete

**Decision so far:**
- `status = 'rejected'` → keep forever (shown to players to prevent re-submission of denied words)
- `status = 'pending'` → keep forever (awaiting admin review)
- `status = 'accepted'` → delete, but timing is unresolved

**The blocker**: There is no column recording *when* a word was actually applied to `words-el.json`. The flow is:
1. Admin marks nomination `accepted` (status flip only)
2. At some later point, `/apply-nominations` skill patches `words-el.json`
3. No DB record of step 2 exists

Deleting accepted rows too soon risks losing the record of what was approved before the apply ran.

**Open questions for next session:**
- How often is `/apply-nominations` run in practice? Is it always within 30 days?
- Add an `applied_at timestamp` column to `nominations` (migration) so we delete only after that is set?
- Or is a 30-day time-based proxy on `accepted` rows safe enough?

**Schema note**: The DB table is `nominations`. Old issue tracker used the legacy name `word_suggestions` (the constraint names in the migration still say `word_suggestions_pkey` etc — legacy artefacts). `nominations` is canonical per `CONTEXT.md`.

---

## DB table retention — full picture

| Table | Cleanup? | Where | Window |
|---|---|---|---|
| `game_scores` | ✅ | `/api/cleanup-scores` cron | 10 days |
| `game_state` | ✅ | same cron | 10 days |
| `transfer_codes` | ✅ | same cron | 10 days (+ 24h `expires_at` on row) |
| `player_profiles` | ❌ Deferred | — | Keep ≥ 100 days; not implemented |
| `nominations` | ⏳ Partial | — | `accepted` rows: TBD; `pending`/`rejected`: forever |
| `nomination_votes` | ✅ Cascades | FK `ON DELETE CASCADE` | Auto when parent nomination deleted |
| `community_*_puzzles` | ✅ Consumed | deleted on use | N/A |
| `community_stavrolekso_puzzles` | ❌ Never | by design | Permanent after approval |

---

## Suggested next steps

1. Decide `applied_at` column vs time-based proxy for `nominations` cleanup
2. Extend [src/app/api/cleanup-scores/route.ts](src/app/api/cleanup-scores/route.ts) with the accepted-nominations DELETE
3. Write unit tests for the new DELETE branch (mock Supabase) — use `/tdd`
4. Add `player_profiles` cleanup when the 100-day threshold is confirmed

## Suggested skills

- `/grill-with-docs` — to nail the `applied_at` vs time-based proxy decision
- `/tdd` — for the new DELETE branches and their unit tests

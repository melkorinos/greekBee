# Handoff — the Stavrolekso creator edit silently no-ops in production

**Status:** ready-for-agent · **Severity: the highest of the 2026-07-16 DB review** — a player-facing feature is broken, invisibly
**Created:** 2026-07-16 (DB review; verified against live `pg_policies`)

## The one-sentence version

`PATCH /api/community-puzzles/stavrolekso/[id]` (the edit-PIN creator flow, ADR 0005) issues its
UPDATE through the **anon client**, but `community_stavrolekso_puzzles` has **no anon UPDATE
policy** — so RLS matches zero rows, PostgREST returns **no error**, the route replies
`{ ok: true }`, and the edit is discarded.

## The evidence

Live `pg_policies` (verified 2026-07-16): the table's only policies are
`anon insert` (INSERT) and `anon select` (SELECT). No UPDATE, for anyone.

The route ([src/app/api/community-puzzles/stavrolekso/[id]/route.ts:85](../../src/app/api/community-puzzles/stavrolekso/%5Bid%5D/route.ts))
does `table(getSupabaseClient(), …).update(updates).eq("id", …)` and checks only `updateError`.
Under RLS, an UPDATE with no applicable policy is **not an error** — it just affects 0 rows. The
project already documents this exact semantic in its own test suite:
`rlsInvariantsLiveDb.test.ts:94` — *"with no DELETE policy, RLS matches zero rows (no error, no
effect)"* — for `game_scores` DELETE. The same rule applies to UPDATE here.

Why nothing caught it: the route's unit tests mock supabase (RLS is invisible to them), and the
live-DB RLS suite covers `game_scores` only. The table currently has 0 rows, so no user edit has
been eaten *recently* — but the flow has plausibly never worked since the RLS baseline.

Contrast with the paths that do work: approve/reject go through `createReviewHandler` in
`communityPuzzleLifecycle.ts`, which deliberately uses `getServiceRoleClient()` for exactly this
reason (its comment: "neither is granted to anon by RLS").

## Shape of the fix

1. In the PATCH handler, after the PIN check passes, run the UPDATE on
   **`getServiceRoleClient()`** — mirroring `createReviewHandler`. The GET/lookup part can stay
   anon (SELECT is granted).
2. **Do NOT fix this by adding an anon UPDATE policy.** RLS cannot see the request's `edit_pin`,
   so any policy broad enough for the route (e.g. `status = 'pending'`) would let *anyone with
   the public anon key* rewrite every pending puzzle via direct PostgREST calls, bypassing the
   PIN check entirely. The PIN check is server-side; the write privilege must be too.
3. Make the silent no-op impossible to reintroduce: have the UPDATE return the touched row
   (`.update(...).eq(...).select("id")`) and treat an empty result as an error instead of
   `ok: true`.
4. Regression coverage: extend `src/test/shared/rlsInvariantsLiveDb.test.ts` with the community
   table posture — anon UPDATE on `community_stavrolekso_puzzles` must affect 0 rows. (Env-gated
   suite; runs locally with `.env.local` keys, auto-skips in CI.)

## Guardrails

- No schema change needed — this is a route fix. If you add the live-RLS test, sentinel rows must
  be wiped by the service role (see how the existing suite does it).
- One shared Supabase project backs dev and prod — any live-test write is a prod write; follow the
  sentinel pattern.
- Gates: `npm run test -- --run`, `npx eslint .`, `npm run build`. `npx tsc --noEmit` has a
  pre-existing 24-error baseline in 6 test files — diff, don't expect zero.

## Files

- `src/app/api/community-puzzles/stavrolekso/[id]/route.ts` — the broken PATCH
- `src/lib/communityPuzzleLifecycle.ts` — the pattern to mirror (`createReviewHandler`)
- `src/test/shared/rlsInvariantsLiveDb.test.ts` — where the regression lock belongs
- `docs/adr/0005-stavrolekso-edit-pin-auth.md` — the design this restores to working order

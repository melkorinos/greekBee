# Handoff — give the Supabase client real types

**Status:** parked, ready-for-agent
**Created:** 2026-07-16
**Prerequisite:** done — the `table()` accessor landed (see "What already happened")

## The one-sentence version

`src/lib/supabase.ts` exports a ~200-line `Database` interface that **nothing type-checks
against**, so it has silently drifted from the real schema. Either regenerate it from the DB
and wire it into the client, or delete it. Do not leave it as-is, and do not hand-patch it.

## Why this is worth doing

The interface is not merely dead weight — it is **actively misleading**. It reads like a
description of the schema, so the next person to trust it will be wrong. Verified against the
live DB (project `rnfsuvhgufhbekodkmlp`) on 2026-07-16:

| Drift | Detail |
|---|---|
| 3 tables missing entirely | `player_achievements`, `player_pangrams`, `identity_audit` — all queried in code |
| Missing column | `game_scores.is_perfect` (real; selected in `api/profile/stats/route.ts`) |
| Wrong values | community_* `status` typed `"pending" \| "accepted" \| "rejected"`, but the code writes **`"approved"`** (`communityPuzzleLifecycle.ts`) |

The live DB has **12 tables**; the interface describes 10, two of which are wrong. The
community_* tables have **no CHECK constraint** on `status`, which is why `"approved"` has
worked in production despite contradicting the type. (`nominations.status` *does* have a
constraint — `pending|accepted|rejected` — and there the interface is correct.)

That divergence is the evidence for the core claim: **a type that nothing enforces will rot.**
Whatever you do here, the end state must be either enforced or absent.

## What already happened (do not redo)

The `table()` accessor landed. `src/lib/supabase.ts` now owns the untyped-client cast exactly
once and every query routes through it:

```ts
export function table(client: FromCapable, name: string): QueryBuilder
```

- 61 `as any` casts + 51 paired `eslint-disable` comments → **0** across 21 files.
- `src/app/api/auth/link/route.ts` had independently invented the same idea (a local
  `db = supabase.from.bind(supabase) as any`); it now delegates to `table()`, which also
  retired the `this`-binding hazard documented in its old comment.
- All 20 `vi.mock("@/lib/supabase", …)` factories in `src/test/` gained a `table` passthrough
  (`(c, n) => c.from(n)`). **Any new export from this module must be added to those mocks** or
  ~130 tests fail with `table is not a function` — that is the one sharp edge of this seam.

**This is what makes the present task a one-module change.** Call sites no longer touch
`.from()` at all, so typing the client means changing `table()`'s signature and nothing else.

## The decision to make first

Non-obvious finding from the migration, and it reframes the work — **reads already compile
without a cast**. The cast exists *only* because supabase-js resolves Insert/Update payloads to
`never` for an untyped client. So:

- `.select(...)` — never needed the cast.
- `.insert/.update/.upsert(...)` — the entire reason `QueryBuilder = any` exists.

So the real question is not "should we add types" but **"is the write-payload typing worth the
coupling?"** Pick one:

**Option A — regenerate and wire in (recommended).**
`npx supabase gen types typescript --project-id rnfsuvhgufhbekodkmlp`, commit the output (e.g.
`src/lib/database.types.ts`), then `createClient<Database>(...)` and let `table()` return a
properly typed builder.
- Re-test the claim in the old comment at `supabase.ts` first: *"Using the Database generic on
  createClient requires matching supabase-js internal GenericSchema exactly, which is brittle
  across minor versions."* That reasoning predates the current **supabase-js 2.105.4** and may
  simply be obsolete. **Verify before inheriting it.** If it still holds, say so in the ADR and
  take Option B.
- The generated types are keyed by table-name literal, so `table(client, name: string)` must
  become generic (`name: T extends keyof Database["public"]["Tables"]`) to return per-table
  shapes. Note `auth/link/route.ts` and `communityPuzzleLifecycle.ts` pass **runtime `string`
  table names**, not literals — they will need a generic parameter or an explicit widening.
  This is the main integration cost; scope it before starting.
- Add a CI check (`gen types` + `git diff --exit-code`) or the regenerated file rots exactly
  like the hand-written one did. **Without this, Option A recreates the original problem.**

**Option B — delete the interface.**
If the generic is genuinely brittle, delete `Database` and keep the three consumers
(`WordSuggestionInsert`, `WordSuggestionRow`, `NominationVoteInsert`) as hand-written standalone
types next to their use. Smaller, honest, no false promise. Strictly better than the status quo.

Both are defensible. What is *not* defensible is leaving a 200-line unenforced description of a
schema it no longer matches.

## Guardrails

- **One Supabase project backs both dev and prod** — every write is production. Type generation
  is read-only and safe.
- Schema changes go through `supabase/migrations/` + `npx supabase db push`, never the dashboard
  or MCP `apply_migration`. **This task should need no DDL at all** — if you find yourself
  writing a migration, you have left the scope.
- Gate: `npm run test -- --run`, `npx eslint .`, `npm run build` must all pass.
- `npx tsc --noEmit` has a **pre-existing** baseline of errors in 6 `src/test/*` files, unrelated
  to this work. Diff against the baseline rather than expecting zero.
- Record the outcome as an ADR in `docs/adr/` — the "why" here (a type nothing enforces will
  rot) is the durable lesson, more than the mechanics.

## Files

- `src/lib/supabase.ts` — the interface, `table()`, the three client getters
- `src/lib/communityPuzzleLifecycle.ts`, `src/app/api/auth/link/route.ts` — the dynamic
  table-name callers that constrain any generic signature
- `src/test/**` — 20 mock factories that must mirror the module's exports

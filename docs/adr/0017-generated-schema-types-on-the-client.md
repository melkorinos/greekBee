# ADR 0017 — The schema types are generated and wired into the compiler

**Status**: Accepted

## Context

`src/lib/supabase.ts` exported a ~200-line hand-written `Database` interface. **Nothing type-checked against it.** The client was created without the `Database` generic, so the interface described the schema to human readers and to no one else.

It had drifted, exactly as an unenforced description will. Verified against the live DB on 2026-07-16:

| Drift | Detail |
|---|---|
| 3 tables missing entirely | `player_achievements`, `player_pangrams`, `identity_audit` — all queried in code |
| Missing column | `game_scores.is_perfect` — real, and selected in `api/profile/stats/route.ts` |
| Wrong values | community_* `status` typed `"pending" \| "accepted" \| "rejected"`, but the code writes **`"approved"`** |

The interface was not merely dead weight, it was **actively misleading**: it read like a description of the schema, so the next person to trust it would have been wrong.

Two facts found while deciding, both of which moved the decision:

**The three types derived from it had zero consumers.** `WordSuggestionInsert`, `WordSuggestionRow` and `NominationVoteInsert` were exported and imported by nothing. The interface was being kept alive to feed types that nobody used.

**Reads never needed the cast.** The `QueryBuilder = any` seam existed *solely* because supabase-js resolves Insert/Update payloads to `never` for an untyped client. `.select()` always compiled. So the real question was never "should we add types" but "is write-payload typing worth the coupling?"

## Decision

**Generate the schema types from the database, and wire them into `createClient` so the compiler enforces them.**

- `src/lib/database.types.ts` — generated, committed, never hand-edited.
- `createClient<Database>(…)` in all three getters (anon singleton, token-scoped, service-role).
- `table()` is generic over `TableName = keyof Database["public"]["Tables"]`, so the returned builder resolves to *that* table's Row/Insert types.
- `QueryBuilder = any` is **deleted**. Not narrowed — gone.
- Row/Insert/Update/TableName/BoundTable helpers are exported for call sites. All are type-only, so the 20 `vi.mock("@/lib/supabase", …)` factories needed no changes.

The old comment claiming the `Database` generic "requires matching supabase-js internal GenericSchema exactly, which is brittle across minor versions" was **re-tested on supabase-js 2.105.4 and did not reproduce.** It was obsolete. It had been sitting there justifying the `any`. Re-testing an inherited justification before inheriting it is the cheapest step in this whole ADR.

### The lesson

**A type nothing enforces will rot.** The hand-written interface is the proof: it was written accurately and decayed silently, because nothing ever disagreed with it.

The corollary matters more, and it is the part that is easy to get wrong: **what fixes that is wiring the type into the compiler, not bolting a drift-checker onto it.** A generated file that nothing checks against would rot exactly as the hand-written one did. `createClient<Database>` is the fix. A drift guard is a *supplement* to that, and only closes one specific residual gap (below).

### What narrowing bought, and what it cost

Every caller passed a string literal, so parameters were **narrowed** to the table-name union rather than widened with a cast:

- `CommunityPuzzleGameConfig.table` → `CommunityPuzzleTable` (`Extract<TableName, \`community_${string}_puzzles\`>`) — the lifecycle only makes sense for the four community queues, so pointing a config at `game_scores` is now a compile error.
- `consumeApprovedPuzzle(tableName)`, `upsertAndClean(tableName)` → the union.
- `api/auth/link`'s `db` shorthand → generic `BoundTable`, which alone fixed **23 of the file's errors**; they had all cascaded from one `name: string`.

The compiler immediately found a real mismatch nothing had noticed: **`.eq("id", id)` was passing URL strings into `bigint` columns** in three routes. PostgREST had been coercing them. Now converted explicitly with `Number(id)`; garbage still lands in the same `db_error` path, since Postgres rejects `"NaN"` exactly as it rejected `"abc"`.

Three casts remain, each at a real boundary and commented there rather than at the call sites:

- **Validation adapters** (`SubmissionValidation.row`) return an untyped bag of columns. That is *why* one lifecycle can serve four games — the module knowing nothing about per-game puzzle shapes is the feature. Widened at that single seam.
- **jsonb columns** (`data`, `state`) are `Json` to the DB, which cannot know the game-level shape inside. Narrowed where read.
- **`upsertAndClean`** widens its payload internally because supabase-js cannot resolve `Insert<T>` for an unresolved generic `T`; the caller's literal pins `T`, so nothing is lost at the call site.

One test changed meaningfully: `communityPuzzleLifecycle.test.ts` used a synthetic `"community_test_puzzles"` to assert the module is game-agnostic. That name no longer type-checks. It now uses a real queue — the client is mocked wholesale, so which of the four it is has no bearing on what the tests exercise.

## Guarding against drift

**Decision: no automated drift guard for now (handoff Option C).** The generated file is regenerated by hand; the compiler catches the common case.

### Why not a drift-checking test (rejected)

The tempting version — a vitest check that parses `supabase/migrations/*.sql` and diffs it against `database.types.ts` — was rejected, and the reasoning is recorded here **so nobody re-proposes it on the same false premise.**

The premise was that such a test "runs free in CI." **It does not. Vitest does not run in CI at all.** `.github/workflows/e2e.yml` is the only workflow, and it runs `npm ci`, `next build`, and `npx playwright test`. Nothing invokes `npm run test`. A vitest drift guard would therefore fire *only* where a live-DB check would — locally, when someone runs the tests — while costing a regex SQL parser over 8 migration files. It has no advantage over the stronger option below, and is the most code and the most fragile.

### Why not regenerate-and-diff yet (deferred, not rejected)

This is the *right* guard, deferred on cost. Its exact shape when we adopt it:

```
supabase gen types typescript --db-url $SUPABASE_DB_URL  +  git diff --exit-code
```

inside a `describe.skipIf(!canRun)` matching `rlsInvariantsLiveDb.test.ts`. Two real prerequisites, both currently unmet:

1. **`SUPABASE_DB_URL` in `.env.local`** — genuinely absent today.
2. **A CI job that runs vitest** — otherwise this guard, too, only ever runs on someone's laptop.

Verified while writing this: `supabase gen types --project-id …` fails with `LegacyPlatformAuthRequiredError` (it wants `SUPABASE_ACCESS_TOKEN` or an interactive `supabase login`), and the `--db-url` form has no URL to use. **So there is deliberately no `npm run db:types` script** — a script that throws on every invocation is the same decorative-artifact failure this ADR is about.

**Until then, regenerate through the read-only Supabase MCP tool `generate_typescript_types`** (`project_id: rnfsuvhgufhbekodkmlp`), which needs no local credentials. That is how the committed file was produced.

**Revisit at launch.** Pre-launch, drift costs nothing.

### The residual risk, stated honestly

"Option C recreates the original rot" would be overstating it, and the distinction is the point of this ADR.

The hand-written interface rotted because it was hand-written **and referenced by nothing** — decorative. With `createClient<Database>`, the compiler now sits on every insert and update. The common drift direction (schema gains a column, types lag) fails to compile the first time anyone uses that column, and the fix is one regeneration. That is not silent rot.

What C genuinely does not catch is the **quiet direction**: a column dropped, renamed, or retyped in prod while the types still describe the old shape. That compiles, and breaks at runtime. Pre-launch that is cheap. At launch it is not — which is why the deferred guard above is gated on launch.

### A gap neither option closes

**The migrations are not guaranteed to equal prod.** `.claude/skills/project-mcp/SKILL.md` documents that MCP-applied DDL has bypassed migration history on this project: neither `apply_migration` nor `execute_sql` records the committed file's version, so the schema can be correct while the CLI's bookkeeping drifts. Any guard that reads `supabase/migrations/` therefore verifies types-vs-migrations, never types-vs-prod. C does not close this and does not claim to; only the regenerate-and-diff guard, which reads the live DB, would.

## Consequences

- `supabase.ts` shrank from ~200 lines of hand-written schema to a generated import. The `any` is gone.
- Column names, table names, required fields, and nullability are now compiler-enforced on every query.
- **Value correctness is still not enforced, and this is the honest limit of the change.** `status` generates as `string`, not a union, because Postgres CHECK constraints do not survive into TypeScript — only real PG enums do, and this DB has none (`Enums: {}`). So `status: "approved"` and `status: "utter_garbage"` both compile. The old hand-written union was not stale so much as **aspirational**: it encoded a constraint the database never had. The community_* tables have no CHECK on `status` at all, which is why `"approved"` worked in production while contradicting the type.
  - *Amended 2026-07-16 — closed for community_* `status`.* Migration `20260716120300` made the column a real PG enum, `community_puzzle_status AS ENUM ('pending', 'approved')` — chosen over a CHECK precisely because an enum survives into the generated types, so both layers now reject a bad value (verified: the regenerated types made `.eq("status", <raw query-param string>)` a compile error in `communityPuzzleLifecycle.ts`, forcing validation). `'rejected'` is deliberately not a value: reject DELETEs the row. The vocabulary divergence from `nominations.status` (`accepted`, CHECK-constrained, keeps history) is deliberate and documented in the migration, not unified. `nominations.status` stays `string` in the types — its CHECK still doesn't generate; acceptable because its writers are two admin routes with literal values.
- `database.types.ts` must never be hand-edited. Hand-patching it would recreate precisely the artifact this ADR deletes.
</content>

# Handoff — the community_* `status` column has no CHECK constraint

**Status:** parked, ready-for-agent
**Created:** 2026-07-16
**Split from:** the typed-client work (ADR 0017), which surfaced this but deliberately left it alone — it needs DDL, and that was out of that task's scope.

## The one-sentence version

The four `community_*_puzzles` tables accept **any string** in `status`. `"approved"`,
`"pending"`, `"utter_garbage"` and `""` are all equally legal in production today, and nothing —
not the database, not the compiler — will stop the last two.

## Why the typed client did not fix this

Worth understanding before you start, because it is the whole reason this is a separate ticket.

ADR 0017 wired the generated schema types into `createClient`, so every query is now checked
against the real DB. That catches column names, table names, required fields and nullability. It
**cannot** catch this. The generated type says:

```ts
community_leksiarxeio_puzzles: { Row: { status: string; … } }
```

`status` generates as `string`, not a union, because **Postgres CHECK constraints do not survive
into TypeScript** — only real PG enums do, and this database has none (`Enums: {}`). Verified by
compiling `.update({ status: "utter_garbage" })` against the typed client: it passes.

So this is a **database-layer** problem with a database-layer fix. No amount of client typing
reaches it.

## The evidence

The old hand-written interface claimed:

```ts
status: "pending" | "accepted" | "rejected"
```

while `communityPuzzleLifecycle.ts` has always written **`"approved"`**. Both were "true" in the
sense that nothing ever disagreed with either. The reason `"approved"` worked in production
despite contradicting the declared type is precisely that **there is no constraint** — the column
is a bare `text`.

Note the contrast, and use it as the model for the fix: **`nominations.status` *does* have a CHECK
constraint** (`pending|accepted|rejected`), and there the old interface was correct. Constrained
columns stayed honest; unconstrained ones drifted. That is not a coincidence.

## What to decide first

**What is the real vocabulary?** Do not assume. `"approved"` is what the code writes and what
`consumeApprovedPuzzle` and the public browse list read (`.eq("status", "approved")`), so it is
almost certainly the live value — but confirm against the actual data before constraining anything:

```sql
SELECT status, count(*) FROM community_leksiarxeio_puzzles GROUP BY status;
-- repeat for leksindeseis, vrestifrasi, stavrolekso
```

**A CHECK constraint is rejected by Postgres if existing rows violate it.** So this query is not
optional curiosity — it is the go/no-go. If prod holds a value you did not expect, the migration
fails on apply, or worse, you constrain away a value something depends on.

Also worth resolving: `nominations` uses `accepted`, the community tables use `approved`. Same
concept, two words. Decide whether to unify or to document the divergence deliberately — but
**do not silently normalize one into the other**; `nominations.status` is constrained and its
values are load-bearing for the admin review queue.

## Shape of the fix

1. Query the live distribution (above). **Do this first.**
2. Add a migration in `supabase/migrations/` — a CHECK constraint per community table, matching the
   vocabulary the data actually holds.
3. Apply with `npx supabase db push`. **Never** the dashboard, and never MCP `apply_migration`
   without committing the matching migration file — see the drift warning in
   `.claude/skills/project-mcp/SKILL.md`.
4. Consider whether `status` should be a real **PG enum** rather than a CHECK. An enum *would*
   generate as a TypeScript union and close the loop opened in ADR 0017 — the compiler would then
   reject `"utter_garbage"` at the call site. This is the more interesting option and probably the
   right one; a CHECK only fixes the DB layer, an enum fixes both. Cost: enums are more awkward to
   alter later. Weigh it, decide it explicitly, and record the choice.
5. If you choose the enum, **regenerate `src/lib/database.types.ts`** afterwards (read-only MCP
   `generate_typescript_types`, `project_id: rnfsuvhgufhbekodkmlp`) and let the compiler show you
   every site that was relying on `string`.
6. Record the outcome in an ADR, or as an amendment to 0017.

## Guardrails

- **One Supabase project backs both dev and prod — every write is production.** A CHECK constraint
  on a table with live rows is a schema change against prod. The `SELECT … GROUP BY status` above
  is read-only and safe.
- This task **does** need DDL — that is what makes it its own ticket rather than part of 0017.
  Migration file first, `db push` second.
- Gates: `npm run test -- --run`, `npx eslint .`, `npm run build`.
- `npx tsc --noEmit` has a **pre-existing** baseline of 24 errors across 6 `src/test/*` files,
  unrelated to this work. Diff against the baseline rather than expecting zero.

## Files

- `supabase/migrations/` — where the fix lands
- `src/lib/communityPuzzleLifecycle.ts` — writes `"approved"` (submit → `"pending"`, approve →
  `"approved"`, reject → DELETE); reads `.eq("status", "approved")` when consuming
- `src/app/stavrolekso/page.tsx`, `src/app/stavrolekso/[id]/page.tsx` — public browse/play, both
  gated on `status === "approved"`
- `src/lib/database.types.ts` — generated; regenerate if you go the enum route, never hand-edit
- `docs/adr/0017-generated-schema-types-on-the-client.md` — why the typed client stops short of this

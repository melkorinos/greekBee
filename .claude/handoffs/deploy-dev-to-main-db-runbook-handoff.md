# Handoff — the next dev→main deploy has two DB coupling points; run them in this order

**Status:** ready-for-agent (execute **at** the next dev→main merge — not before)
**Created:** 2026-07-16 (DB review; all claims verified live)

## The one-sentence version

Prod (`main`) is 13 commits behind `dev` and the gap contains the Vres Tin Frasi
points flip (ADR 0014), whose **data migration must land with the deploy, not before or after** —
and the migration pipeline itself is currently jammed by an unrecorded index migration that will
make `npx supabase db push` fail until repaired.

## Verified state (2026-07-16)

| Fact | Verified how |
|---|---|
| Live migration history ends at `20260706120000` | MCP `list_migrations` |
| `20260715120000` (game_scores read indexes) **is applied** but **not in history** | both indexes present in `pg_indexes`; applied via MCP `execute_sql` on 2026-07-15 when `apply_migration` 502'd (session 85) |
| `20260715120100` (vrestifrasi attempts→points flip) **is NOT applied** | history + live data: vrestifrasi rows still hold old-shape values |
| Prod code still posts **attempt counts** for Vres Tin Frasi | `main` has neither ADR 0014 nor the flip code (`git ls-tree main docs/adr` stops at 0013) |
| `main..dev` = 13 commits | incl. ADR 0014/0015/0016/0017 work; typed-client changes (session 90) are **still uncommitted in the working tree** |

The current state is *consistent* — old code + old data — but it is a landmine: applying the data
migration early corrupts the live 7-day leaderboard window; deploying the code without the
migration inverts the ranking of existing rows.

## The runbook

1. **Commit the typed-client working tree first** (session 90's work: `database.types.ts` + typed
   `supabase.ts` etc. — gates were all green at session end). A deploy from a dirty tree loses it.
2. **Manual browser play-through** of dev preview before merging — standing requirement
   (goals.md item 1; Leksodromia + Leksoplegma land on main with this merge).
3. **Repair migration history** so push can work (the repo is NOT `supabase link`ed; use
   `--db-url "$SUPABASE_DB_URL"` — the var is currently absent from `.env.local`, the operator
   has the value):
   `npx supabase migration repair --status applied 20260715120000 20260716120000 20260716120100 20260716120200 20260716120300 --db-url …`
   Without this, `db push` re-runs those migrations (bare `CREATE INDEX` / `DROP POLICY` /
   `CREATE TYPE`, none idempotent) and fails on "already exists" / "does not exist".
   *(Updated 2026-07-16: the four `202607161203xx`-range files — transfer-codes lockdown, anon
   policy narrowing, dedup backstops, community status enum — were applied via MCP
   `apply_migration`, which recorded its own invented versions (`20260716175545` etc.), not the
   files' versions. The invented history rows are harmless; the five file versions above are the
   ones push checks. Also: the still-pending `20260715120100` now sorts before recorded versions,
   so `db push` will need `--include-all`.)*
4. **Merge dev → main**, let Vercel build and go READY.
5. **Immediately after the new code is live:** `npx supabase db push --db-url …` — the only
   pending migration is `20260715120100`, the row flip. Immediately-after (not before) is ADR
   0014's ordering: never invert rows while old code still posts the old shape.
6. **Sanity-check the flip:** `SELECT puzzle_date, score FROM game_scores WHERE
   game_id='vrestifrasi'` — only 3 rows exist today (scores 2/3/6, old shape → become 5/4/1).
   Rows older than the 7-day leaderboard window are cosmetic either way.

## Guardrails

- One Supabase project backs dev and prod — steps 3 and 5 are prod writes. Take the pre-migration
  dump first (ticket 02's interim rule: manual `supabase db dump` before any risky migration —
  note `npm run db:backup` currently throws on the same missing `SUPABASE_DB_URL`, so fix or
  inline the dump command).
- If `db push` is unusable, the MCP fallback rules are in `.claude/skills/project-mcp/SKILL.md`
  ("Applying migrations via MCP — the two gotchas") — but push is strongly preferred here
  precisely because history drift is what step 3 is cleaning up.

## Files

- `supabase/migrations/20260715120000_add_game_scores_read_indexes.sql` — applied, unrecorded
- `supabase/migrations/20260715120100_vrestifrasi_scores_to_points.sql` — pending, deploy-coupled
- `docs/adr/0014-leaderboards-are-higher-is-better.md` (dev) — the ordering rationale
- `.claude/skills/project-mcp/SKILL.md` — migration-history gotchas, project IDs

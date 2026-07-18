# Pickup 03: Words found by length — capture lane + profile display

**Date:** 2026-07-18 · **Status:** 🟡 **CODE COMPLETE (session 110) — one step left: apply migration `20260718120000_add_player_words.sql`.** Delete this file once it's applied and the 3 red `rlsInvariantsLiveDb` assertions go green.

> **⚠️ The apply has a trap:** seven earlier migration versions were applied via MCP but never recorded, so a naive `npx supabase db push` re-runs them — including the vrestifrasi flip, which would **un-flip live leaderboard scores**. Correct sequence (operator, has `$SUPABASE_DB_URL`):
> ```
> npx supabase migration repair --status applied 20260715120000 20260715120100 20260716120000 20260716120100 20260716120200 20260716120300 20260717120000 --db-url "$SUPABASE_DB_URL"
> npx supabase db push --db-url "$SUPABASE_DB_URL"
> ```
> (cross-check the version list against `/project-mcp` before running). This clears the repair debt for good; MCP `apply_migration` would work too but adds an eighth owed repair. After apply: re-run `npm run test -- --run` (3 live-DB assertions go green) and update `/project-mcp` SKILL.md (table count 13 → 14, repair list emptied).

Everything below is the original spec, kept for reference until deletion. Decisions taken during build: Q1 = RPC read-side (`player_words_by_length`, invoker-rights), Q2 = capture rides `FEATURE_FLAGS.achievements` (dark until launch; pre-launch history deliberately forfeited).

**The model to mirror is the shipped pangram lane (ADR 0013 lane C)** — read that shape before writing anything: `player_pangrams` migration, `POST /api/pangrams` (insert-if-absent + `sanitizePangramWords` guards), `planPangramMerge` in `restore()`, the 3rd `useAchievementSync` lane (per-word delta-post + mount self-heal on the one `fetchLifetimeStats` read), `pangram_count` on `/api/profile/stats`.

## Operator decisions (2026-07-18)

- **Leksokipos-only now** — it's the only game with free-form "found words". Design so a later cross-game extension is a column value, not a rewrite.
- **Write volume accepted:** one row per valid daily find (~20–40 rows/player/day), append-forever, same semantics as pangrams.
- **Does NOT subsume `player_pangrams`** — separate tables (a merge is a possible later cleanup, not now).
- **No badge in this task** — display only. Badges over this data are parked in `badges-parked.md`.
- Backfill is impossible (historical finds were never stored, except pangrams) — everyone starts at zero; the empty state must not imply history exists.

## Build

1. **Migration `player_words`:** `device_uuid`, `puzzle_date` (ISO date), `word`, `created_at` — plus, recommended: `game_id text NOT NULL DEFAULT 'leksokipos'` (cheap future-proofing) and `length smallint` set server-side (enables aggregate reads without fetching rows). `UNIQUE(device_uuid, puzzle_date, word)` (include `game_id` if added). RLS per the session-92 posture: anon **SELECT + INSERT only** — no UPDATE/DELETE. Apply via `npx supabase db push` (mind the migration-repair debt listed in `/project-mcp`).
2. **`POST /api/words`:** insert-if-absent batch, mirroring `/api/pangrams` — edge runtime, shape guards (`isISODate`, `normalizeLetters`, Greek-letters regex, per-word length cap, array-size cap), returns the count.
3. **4th `useAchievementSync` lane:** delta-post each valid find on daily puzzles only (same gates as pangrams: daily, `!isGodMode`), plus mount self-heal riding the ONE existing stats fetch — no new reads.
4. **`planWordsMerge`** mirroring `planPangramMerge`, unioned in Sign-in Restore.
5. **Read side:** per-length counts for the device. Prefer server-side aggregation (the `length` column + a PostgREST aggregate, or a small view/RPC) over fetching every row — the stats route already fans out 3 queries and rows here grow far faster than pangrams. Flag the Fluid-CPU envelope in a comment per soul.md.
6. **Display:** a new Profile section "Λέξεις ανά μήκος" (its own card near `LifetimeStatsStrip`, not more strip cells): total words found + per-length breakdown — lengths 4…9 individually with a "10+" tail is the starting shape; adjust against real data. **If rendering bars or any chart, load the `dataviz` skill FIRST** (semantic-token palette, light + dark). No new chart library (dependency rule).
7. **Live-DB posture:** extend `rlsInvariantsLiveDb.test.ts` coverage to the new table (mirror the pangrams rows).

## Docs

ADR 0013 amendment (a lane-C sibling table — record the `game_id`/`length` column decisions) and CONTEXT.md (glossary + Profile Page section list).

## Tests

Mirror the pangram set: sanitize guards, route (insert-if-absent, validation, DB errors), merge plan, sync lane (delta-post, self-heal, gating), display component (loading/error/empty/values), live-DB RLS.

Gates per CLAUDE.md, all green.

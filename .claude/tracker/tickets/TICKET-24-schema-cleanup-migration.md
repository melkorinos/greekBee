# One migration: drop both community tables, `game_scores.data`, `is_perfect`, and land ISSUE-01 §3

**Status:** in-progress — **everything an agent can do is done.** The migration file is written and
every doc is rewritten; what remains is four operator commands against the live database, listed
under *What is left* below.
**Blocked by:** the ADR 0027 code removals — **both halves must be deployed to production**, not
merely merged. §1-§3 (scoring + leaderboard, `0e8685b`) and §4 (community submission, `a0c4590`) are
committed to `dev` and **`dev` is ahead of `origin/dev`**, so neither is pushed and neither is live.
Nothing here may run until they are: an old deployed bundle POSTing to a dropped table is the
failure mode the ordering prevents. Also blocked on the **operator**: `npx supabase db push` and
`npm run db:rehearse` have both been pre-blocked by the permission classifier before (project-mcp
skill, trap 3). The operator has offered to run them; hand over the exact command rather than
fighting the block.
**Spec:** [ADR 0027](../../../docs/adr/0027-two-games-lose-scoring-and-community-submission.md) §5

## Why

Four schema changes are owed and all of them touch tables that no longer have the code they served.
They land as **one migration** because `supabase/migrations/` was frozen only to preserve a single
guarantee — DDL against an empty `game_scores` on release day — and dropping `data` early spends
that guarantee. Once DDL runs against a populated `game_scores` at all, splitting it into two
migrations pays the same risk twice for nothing (ADR 0027 §5).

Two of the statements are ISSUE-01 §3's, which sat on release day *only* because the folder was
frozen — that issue says so in as many words. Neither depends on the wipe; `nominations` survives
step 4 untouched. So they come along, and **runbook step 5 disappears entirely**, taking release day
from six steps to five. A shorter release day is the point, not a side effect.

The freeze's risk is answered by mechanism instead of timing: `npm run db:backup` then
`npm run db:rehearse` (ADR 0024), which replays the pending queue against a real restored archive.

## What is left — operator only, in this exact order

1. **Push and deploy** the ADR 0027 removals, and **confirm production is serving them.** Check the
   deployed commit, not a green test suite (`reflections.md`: live-DB tests go green on a migration
   alone and are blind to whether the deploy happened).
2. **`npm run db:backup`**, then **upload the archive** to the private Drive folder. One Supabase
   project backs dev and prod; there is no PITR on the free tier and this is the only undo.
3. **Re-measure both queues** immediately before dropping. They were 0/0 on 2026-08-20, but the drop
   is irreversible and the check is one query:
   `select (select count(*) from community_leksiarxeio_puzzles), (select count(*) from community_vrestifrasi_puzzles);`
   **Non-zero means stop and ask** — someone submitted through a cached bundle.
4. **`npm run db:rehearse`**, then **`npx supabase db push`**, then regenerate
   `src/lib/database.types.ts` and commit it. **Never `apply_migration` via MCP** — it invents its
   own version and the committed file's version then re-fires on the next push.

Delete this file and add a `SPENT` row once step 4 lands and the verify queries below return their
numbers.

## Scope

### The migration — DONE

- [x] `supabase/migrations/20260820120000_drop_two_community_queues_and_dead_score_columns.sql`:

```sql
-- ADR 0027 §4 — both queues measured empty; the submitting code is gone as of
-- ADR 0027. An empty table left in the schema reads as a live feature.
drop table if exists public.community_leksiarxeio_puzzles;
drop table if exists public.community_vrestifrasi_puzzles;

-- ADR 0027 §5 — Leksiarxeio's per-length fold was `data`'s only writer and nothing
-- ever read it back. Dead since the scoring removal shipped on 2026-08-20.
alter table public.game_scores drop column if exists data;

-- ISSUE-05 — dead since ADR 0013 retired the perfect-round concept. 0 rows true,
-- 583 false. Never read, never written, by anything but the generated types.
alter table public.game_scores drop column if exists is_perfect;

-- ISSUE-01 §3 — GET /api/nominations/lookup matches no index and scans the table on
-- every nomination-modal open. Measured TICKET-14: index-only scan at every scale
-- including today's 191 rows, 3 buffers vs 1,064. ~2 MB at 50,000 rows.
create index if not exists nominations_word_direction_status_idx
  on public.nominations (word, direction, status);

-- ISSUE-01 §3 — the one non-normalised row in 191. Final sigma, so a re-proposal
-- normalises to ιουνιοσ and its prior-rejection warning can never fire.
update public.nominations set word = 'ιουνιοσ'
 where word = 'ιουνιος' and direction = 'remove';
```

- [ ] `npx supabase db push` (operator — the `SUPABASE_DB_URL` session-pooler URI in `.env.local`;
      no Docker needed).
- [ ] **Regenerate `src/lib/database.types.ts`** (ADR 0017 — the generated types are trusted, so
      they cannot keep offering columns and tables that are gone). Types are compile-time only, so
      that commit needs no deploy of its own. It removes `community_leksiarxeio_puzzles`,
      `community_vrestifrasi_puzzles`, and `game_scores`'s `data` + `is_perfect`.

### Verify — after the push

- [ ] `select count(*) from information_schema.columns where table_schema='public' and table_name='game_scores' and column_name in ('data','is_perfect');` → **0**
- [ ] `select count(*) from information_schema.tables where table_schema='public' and table_name like 'community_%';` → **2** (leksindeseis, stavrolekso)
- [ ] `select count(*) from pg_indexes where indexname='nominations_word_direction_status_idx';` → **1**
- [ ] `select count(*) from nominations where word='ιουνιος' and direction='remove';` → **0**
- [x] `npm run test -- --run` — checked against the `data` drop before the push, not after. Neither
      live-DB suite names `data` or `is_perfect`: both insert exactly
      `(game_id, puzzle_date, device_id, display_name, score)` — `scoreRow()` in
      `rlsInvariantsLiveDb.test.ts:56`, the literal at `cleanupScoresLiveDb.test.ts:152` — and read
      back only `score` / a row count. Both dropped columns carried a `NOT NULL DEFAULT`
      (`data` → `'{}'::jsonb`, `is_perfect` → `false`), which is what was covering those inserts;
      removing them leaves the insert shape unchanged.

### Docs — DONE, all in this branch

- [x] `docs/launch-runbook.md` — release-day step 5 deleted and the list renumbered to **five
      steps**. A replacement paragraph says where the schema work went and why the ordering rule
      that survives (deploy before migrate) lives outside the list.
- [x] `ISSUE-05` deleted; `SPENT` row added in `src/test/shared/trackerReferences.test.ts`.
- [x] `.claude/aiHelper/reflections.md` — the ISSUE-05 id is out of the "gates whose enforcement is
      a human reading a line" section; the lesson stays. The DB-test-blind-to-the-deploy section now
      describes the real live state.
- [x] **ADR 0013 amended** — its "the column is kept … an optional drop can ride a future migration"
      line now records that it rode one. No new ADR: a reader asking where `is_perfect` went is
      already sent to 0013.
- [x] `ISSUE-01` §3 — index and sigma fix marked shipped; what remains is the still-deferred
      moderation half. Nothing points at runbook step 5 any more. **Corrected while rewriting:** the
      draft claimed nothing stops the next non-normalised row. False —
      `POST /api/nominations` writes `normalizeLetters(word).trim()` (route.ts:119). That row was
      legacy residue.
- [x] `CONTEXT.md` — both dropped-table rows deleted outright, and the `game_scores` row now says
      there **is** no `data` jsonb rather than that nothing writes it.
- [x] `supabase/scripts/launch-reset.sql` — its KEPT block already excludes both queues and says
      why. Still reads true; no edit made.
- [x] `CONTEXT.md`'s migrations-hardening paragraph — verified. It says *four migrations*, meaning
      the `202607161200xx` series, and never counts community tables, so it reads true at two. (The
      ticket's pointer to "line 281" was stale; it is line 275.)
- [x] `.claude/aiHelper/memory.md` — **The launch reset** row no longer says `game_scores` DDL rides
      runbook step 5 nor that nothing may enter `supabase/migrations/` in advance. It names the
      migration file and says release day is five steps.
- [x] `.claude/aiHelper/coverageMap.md` — no test file moved or was added, so no update owed.

## Done when

Every verify query returns the number above; `npm run test -- --run`, `npx eslint .` and
`npm run build` pass; `supabase/migrations/` contains the new file and `npx supabase migration list`
shows it applied with no invented versions; `docs/launch-runbook.md` has five release-day steps;
`ISSUE-05` is deleted and recorded in `SPENT`; and no current-state doc still points a reader at
runbook step 5. **All of these hold except the four that need the live database.**

## Not in scope

**The 50 beta rows in `game_scores`.** `launch-reset.sql` deletes every row at release-day step 4.
The append-forever rule (ADR 0012's amendment) has exactly one licensed exception and that script is
it — this ticket does not add a second, and must not `delete from game_scores` for any reason.

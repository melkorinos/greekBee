# One migration: drop both community tables, `game_scores.data`, `is_perfect`, and land ISSUE-01 §3

**Status:** ready
**Blocked by:** the ADR 0027 code removals — **both halves must be deployed to production**, not
merely merged. §1-§3 (scoring + leaderboard) and §4 (community submission, TICKET-23) are both
**committed to `dev` on 2026-08-20 and neither is deployed**. Nothing here may run until they are
live: an old deployed bundle POSTing to a dropped table is the failure mode the ordering prevents. Also blocked on the **operator**: `npx supabase db push` and `npm run db:rehearse` have both
been pre-blocked by the permission classifier before (project-mcp skill, trap 3). The operator has
offered to run them; hand over the exact command rather than fighting the block.
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

## Scope

### Before the push — not optional

- [ ] `npm run db:backup`, and **upload the archive** to the private Drive folder. One Supabase
      project backs dev and prod; there is no PITR on the free tier and this is the only undo.
- [ ] `npm run db:rehearse` — restores the newest archive locally and applies the pending migration
      against real rows. This is the rehearsal the release-day slot would have provided.
- [ ] Confirm the scoring removal and TICKET-23 are **live on production**, not just merged. `reflections.md`
      records that live-DB tests go green on a migration alone and are blind to whether the deploy
      happened — check the deployed commit, not the test result.
- [ ] Re-measure both queues immediately before dropping. They were 0/0 on 2026-08-20, but the drop
      is irreversible and the check is one query:
      `select (select count(*) from community_leksiarxeio_puzzles), (select count(*) from community_vrestifrasi_puzzles);`
      **Non-zero means stop and ask** — someone submitted through a cached bundle.

### The migration

- [ ] Write `supabase/migrations/<YYYYMMDD>120000_drop_two_community_queues_and_dead_score_columns.sql`:

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

- [ ] Push with `npx supabase db push` (the `SUPABASE_DB_URL` session-pooler URI in `.env.local`;
      no Docker needed). **Never `apply_migration` via MCP** — it invents its own version and the
      committed file's version then re-fires on the next push.
- [ ] **Regenerate `src/lib/database.types.ts` in the same commit** (ADR 0017 — the generated types
      are trusted, so they cannot keep offering columns and tables that are gone). Types are
      compile-time only, so this commit needs no deploy of its own.

### Verify

- [ ] `select count(*) from information_schema.columns where table_schema='public' and table_name='game_scores' and column_name in ('data','is_perfect');` → **0**
- [ ] `select count(*) from information_schema.tables where table_schema='public' and table_name like 'community_%';` → **2** (leksindeseis, stavrolekso)
- [ ] `select count(*) from pg_indexes where indexname='nominations_word_direction_status_idx';` → **1**
- [ ] `select count(*) from nominations where word='ιουνιος' and direction='remove';` → **0**
- [ ] `npm run test -- --run` — including the live-DB suites `rlsInvariantsLiveDb.test.ts` and
      `cleanupScoresLiveDb.test.ts`, both of which write to `game_scores`. ISSUE-05 verified neither
      names `is_perfect`; **neither has been checked against the `data` drop** — do that before the
      push, not after.

### Docs — all of it, in the same branch

- [ ] **`docs/launch-runbook.md` — delete release-day step 5 and renumber.** Its migration block is
      entirely superseded. Release day becomes: merge+deploy → verify → backup → `launch-reset.sql`
      → announce. Rewrite the surrounding prose too: step 5 is currently described as the moment
      DDL "cannot cost anything", and step 4's paragraph explains the ordering *to* it.
- [ ] **Delete `.claude/tracker/issues/ISSUE-05-dead-is-perfect-column-launch.md`** and add
      `"ISSUE-05": "dead is_perfect column — shipped <date>, folded into TICKET-24"` to the `SPENT`
      map in `src/test/shared/trackerReferences.test.ts`. That test fails if any current-state doc
      names a tracker item with no file on disk, so this is not optional bookkeeping.
- [ ] **`.claude/aiHelper/reflections.md` names `ISSUE-05` by id** — the "gates whose enforcement is
      a human reading a line" section closes on it. Deleting the issue file breaks the tracker guard
      from a file you will not think to look in. Rewrite that sentence in the same commit; the
      *lesson* stays, the id goes.
- [ ] **Amend ADR 0013** — its line "data stays, nothing reads it; an optional drop can ride a
      future migration" becomes false the moment this lands. ISSUE-05 flagged it as easy to forget
      and it is now one remove further from the thing that would have prompted it. Amend 0013; do
      **not** open a new ADR (a reader asking where `is_perfect` went is already sent there).
- [ ] **`ISSUE-01` §3** — the index and the sigma fix are done. Rewrite the section so what remains
      is only the still-deferred moderation half; do not leave "its body is written into runbook
      step 5" pointing at a step that no longer exists.
- [ ] `CONTEXT.md` — the `game_scores` row's `data` jsonb sentence, and the two dropped table rows.
      TICKET-23 rewrote both table rows to read **"Orphaned, 0 rows … TICKET-24 drops it"** rather
      than deleting them, because the tables still existed when it shipped. **Delete both rows
      outright here** — they are the last current-state doc claiming those tables exist.
- [ ] `supabase/scripts/launch-reset.sql` — TICKET-23 rewrote its KEPT block to drop both tables
      from the list and say why. Verify it still reads true once they are gone; no edit expected.
- [ ] `CONTEXT.md` line 281 — the migrations-hardening paragraph names the community `status` enum
      across four tables. Verify it still reads true at two.
- [ ] `.claude/aiHelper/memory.md` — **The launch reset** row states that `game_scores` DDL should
      ride runbook step 5 and that "nothing may enter `supabase/migrations/` in advance". Both stop
      being true. This is the single most load-bearing false claim this ticket creates: a future
      session reads that row at startup and will re-freeze the folder on its own authority.
- [ ] Update `.claude/aiHelper/coverageMap.md` if any test file moved or was added.

## Done when

Every verify query returns the number above; `npm run test -- --run`, `npx eslint .` and
`npm run build` pass; `supabase/migrations/` contains the new file and `npx supabase migration list`
shows it applied with no invented versions; `docs/launch-runbook.md` has five release-day steps;
`ISSUE-05` is deleted and recorded in `SPENT`; and no current-state doc still points a reader at
runbook step 5.

## Not in scope

**The 50 beta rows in `game_scores`.** `launch-reset.sql` deletes every row at release-day step 4.
The append-forever rule (ADR 0012's amendment) has exactly one licensed exception and that script is
it — this ticket does not add a second, and must not `delete from game_scores` for any reason.

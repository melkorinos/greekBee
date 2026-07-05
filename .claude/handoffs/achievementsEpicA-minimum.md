# Handoff: Achievements Epic A — Minimum (Leksokipos, 5 one-shots)

**Date:** 2026-07-05 (spine LOCKED via grill + schema audit; sketched 2026-07-02)
**Status:** 🟢 **Spine locked — ready for `/tdd` pickup.** No open architecture calls. Storage/merge/retention decided in **ADR 0013**.
**✅ Sequencing done (2026-07-05): issue `03-game-scores-prune-contradicts-append-forever` is landed** — the user wanted the retention correction in before achievements, and it is: `/api/cleanup-scores` no longer prunes `game_scores` (append-forever now real). Epic A (5 one-shots) and Epic B's `syllektis-ponton` are both clear to start.
**Goal:** ship the smallest real achievements slice — 5 one-shot badges that earn and light up in the Trophy Case. Silent (no toast). Tiered badges + toast + stats page are **Epic B** (`achievementsEpicB-deferred.md`).

**Prerequisite — ✅ SATISFIED 2026-07-03:** durable identity shipped (Sign-in Restore / Disconnect / `identity_audit`). Achievement data keys on the canonical `device_uuid` (never `auth_user_id`); Sign-in Restore repoints everything to it (**ADR 0012**). Parent epic context: `.claude/handoffs/nemesisFeature.md`.

---

## Locked decisions (ADR 0013 — read it first)

The spine was re-grilled at pickup and the storage model **changed from the old JSON-blob sketch to immutable rows.** Rationale in `docs/adr/0013-achievements-immutable-earned-fact-rows.md`. Summary:

1. **Storage = immutable fact rows**, NOT a JSON blob. New table:
   `player_achievements(device_uuid text, achievement_id text, earned_at timestamptz default now())`, `UNIQUE(device_uuid, achievement_id)`. One row = one earned Achievement (glossary: *Achievement* = earnable condition; *Badge* = its visual token; not "trophy").
2. **Earning = insert-if-absent:** `INSERT … ON CONFLICT (device_uuid, achievement_id) DO NOTHING`. There is no "replace the set" operation, so earned achievements **cannot be clobbered** — "earned forever" holds by construction. (This is why rows beat the blob: the blob's whole-set rewrite was the progress-loss risk.)
3. **Detection = client-side, at end-of-game**, pure logic in `src/games/leksokipos/lib/achievements.ts`. Server runs **zero** detection. Same trust model as client-posted scores.
4. **Write RLS = open**, mirroring `game_state`'s `anon access` (`USING (true) WITH CHECK (true)`). Do **not** store on `player_profiles` — its `UPDATE` is owner-scoped (breaks anon writes for signed-in players) and its `NOT NULL display_name` fights upsert-if-absent.
5. **Sign-in Restore merge (critical — the one real progress-loss hole):** in `restore()` (`src/app/api/auth/link/route.ts`, before the profile-row delete at ~line 157) re-point the old device's achievements onto the canonical identity —
   `UPDATE player_achievements SET device_uuid = <canonical> WHERE device_uuid = <old>`, de-duped via the unique constraint. Mirror `planScoreMerge`. **Without this, restoring an account drops the old device's achievements.**
6. **Retention:** `player_achievements` is lifetime / append-forever — **never** swept. `/api/cleanup-scores` sweeps `game_state` only; do not add this table to it.
7. **Not derivable — must be stored:** audited `game_scores` — a Leksokipos daily persists only `score` + `is_perfect`; found words are **not** kept (they live in the 7-day-swept `game_state`). So `sidirodromos` (10+ letter word) and `theristis` (80% of words) **cannot** be derived after the fact — they must be detected live and stored. Deriving achievements from stats is also rejected because re-derivation would un-earn on threshold changes (violates ADR 0012 "never revoked by rule changes").
8. **Keep the one derived cross-check:** the 🏛️ Τζιμάνι leaderboard glyph stays independently derived from `game_scores.is_perfect` — belt-and-suspenders vs a missed client detection; self-heals on the next perfect game. Do not remove it.

**Data-class boundary (don't blur it):** earned Achievement facts → `player_achievements` rows (this epic). **Lifetime Stats** (total points, puzzles played, Τζιμάνι count, Streak) → **derived from `game_scores`, never stored.** Epic B progress counters (e.g. lifetime distinct-pangram set) → deferred store, designed in Epic B.

**⚠️ Pre-existing dependency flag (not this epic's job, but know it):** `game_scores` is pruned at `SCORE_RETENTION_DAYS = 10` by `/api/cleanup-scores`, which contradicts ADR 0012's "append-forever" and makes `/api/profile/stats` a *10-day* rolling total, not lifetime. Achievement **facts are immune** (own table, never swept) — but the 🏛️ `is_perfect` derived cross-check (decision #8) only self-heals within that window, and Epic B's point tiers / true Lifetime Stats are blocked until the append-forever contradiction is resolved. Flagged for its own fix; does not block Epic A's 5 one-shots.

---

## Extensibility check (verified 2026-07-05) — the model scales past these 5

Stress-tested against future achievements to confirm the store isn't a dead end. The fact store is **agnostic to who writes a fact and which feature it came from** (keyed only by `device_uuid` + `achievement_id`), so new achievements are "just another frozen id." Detection has three lanes:

- **Lane A — client, live, at an event hook** (end-of-game, *and other hooks* like nomination-submit). Covers most, incl. hypotheticals *0 wrong guesses* and *report-a-word* (the latter proves awards can be **platform-wide / cross-feature**, not per-game).
- **Lane B — deferred server-side at puzzle-close** for **relative / time-dependent** signals whose value isn't final at end-of-game (e.g. *1st/2nd/3rd place* — rank keeps moving as others play). A once-per-day job reads the final leaderboard and writes the same fact rows. The one deviation from "client detects everything." *(Since issue 03, `game_scores` is append-forever, so this job no longer races a prune.)*
- **Lane C — append-only set → size → crossing fact** for cumulative counts (Epic B tiers; see Epic B handoff).

Not a lane: **derivation** (a derived award would vanish when its `game_scores` row is pruned — see the flag above). Epic A uses Lane A only; A/B/C don't change the schema — the same `player_achievements` rows serve all of them.

---

## Scope — the 5 one-shot badges only

Leksokipos only. Catalog already ships as pure data in `src/games/leksokipos/lib/achievements.ts` (ids, Greek names, hints; `AchievementPredicate` type declared, unimplemented). `src/components/profile/TrophyCase.tsx` already renders every entry **locked/greyed** — this epic wires the **earned** state onto it.

| id | Client signal (detected at end-of-game) | Durable? |
|---|---|---|
| `leksokipos-first-daily` | first daily played (first score post) | derivable, but detect+store uniformly |
| `leksokipos-stin-korifi` | rank == Απολυτότητα (`score ≥ maxScore`) | derivable |
| `leksokipos-tzimani` | perfect game — `is_perfect` locally | derivable (+glyph cross-check) |
| `leksokipos-sidirodromos` | any found word ≥ 10 letters | **NOT derivable — must store** |
| `leksokipos-theristis` | `foundWords/validWords ≥ 80%` (count axis, ≠ Endgame Zone's points axis) | **NOT derivable — must store** |

All 5 are detected client-side into the same insert-if-absent path (one code path). The 2 tiered badges (`kynigos-pangram`, `syllektis-ponton`) stay **locked** in v1 — Epic B.

---

## Pieces of work (suggested `/tdd` slices)

1. **Migration** — `player_achievements` table + `UNIQUE(device_uuid, achievement_id)` + open RLS (copy `game_state`'s `anon access`). `supabase/migrations/` + `npx supabase db push`. (Shared dev/prod DB — treat as prod.)
2. **Pure detection** — implement the 5 predicates in `src/games/leksokipos/lib/achievements.ts`, fired at end-of-game. Zero React imports; unit-tested (red-green).
3. **Earn endpoint + wiring** — POST route that does `INSERT … ON CONFLICT DO NOTHING` for newly-detected ids (mirror the `game_state` open-write pattern via `upsertAndClean`-style helper, or a thin insert). Client posts at end-of-game.
4. **Fetch + light TrophyCase** — `/profile` fetches earned `achievement_id`s for the device; `TrophyCase` lights matching tiles, unearned stay locked. (Decide: fold into `/api/profile/stats` or a separate route — see open specifics.)
5. **Restore merge** — add the achievement re-point to `restore()` (decision #5). Regression-test: two devices with disjoint earned sets → after Restore the canonical device has the union.

**Ship criteria:** the 5 one-shots earn + light up; the 2 tiered badges stay locked; silent (no toast); Restore preserves the union of earned sets.

**Open Epic-A specifics (not blocking; decide in-slice):** exact end-of-game hook point for detection; whether `/profile` folds the earned fetch into `/api/profile/stats` or a separate route.

---

## Constraints

- Pure logic (predicates) in `src/games/leksokipos/lib/` — zero React imports; testable.
- DB changes only via `supabase/migrations/` + `npx supabase db push`. One shared Supabase project backs dev+prod — every write is production.
- Run `npm run test -- --run`, `npx eslint .`, `npm run build` after each change (0 failures/errors). PowerShell only.
- No new npm deps without approval. Edge runtime for the routes; no per-word hotpath cost (soul.md Fluid-CPU).
- Achievement ids **freeze on first deploy** — renaming/removing orphans earned rows (same rule as Puzzle IDs).
- CONTEXT.md already carries the Achievement/Badge/Trophy Case/Lifetime Stats glossary — extend only if a term shifts.

## Suggested skills

- `/aihelper` — context reload at session start
- `/tdd` — implementation (red-green-refactor per slice above)

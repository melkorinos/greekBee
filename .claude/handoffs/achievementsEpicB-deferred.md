# Handoff: Achievements Epic B — Tiered badges, stats, unlock UX (deferred)

**Date:** 2026-07-05 (grilled; **realigned to ADR 0013 storage model 2026-07-05**)
**Status:** Deferred — do NOT start until **Epic A** ships (`achievementsEpicA-minimum.md`). Epic A lays the spine (client detection + the `player_achievements` immutable-fact store) this epic builds on.
**✅ Blocker cleared (2026-07-05):** issue `03-game-scores-prune-contradicts-append-forever` is **resolved** — `/api/cleanup-scores` no longer prunes `game_scores`, so lifetime points are genuinely append-forever. `syllektis-ponton` is unblocked. (This epic still waits on Epic A shipping first.)
**Goal:** finish achievements "properly" — the 2 tiered badges, extra stats, unlock-moment UX, richer badge display.

**Depends on Epic A:** the `player_achievements(device_uuid, achievement_id, earned_at)` rows table, the insert-if-absent earn endpoint, the client detection engine, and the confirmed spine (**ADR 0013**). Read Epic A's handoff first — its locked-decisions + extensibility sections are the shared architecture.

> **⚠️ Storage model changed.** An earlier draft of this handoff assumed a single `player_stats(data jsonb)` blob. That was **rejected in ADR 0013** in favour of immutable rows (blob's whole-set rewrite was a progress-loss risk). Everything below is realigned: **awards are fact rows; progress is append-only sets (also rows) or derived — never a mutable counter, never a JSON blob.**

---

## Scope

### 1. The 2 tiered badges (Χάλκινο → Ασημένιο → Χρυσό)

Each **tier is its own frozen `achievement_id`** (`…-chalkino/-asimenio/-chryso`) and becomes a `player_achievements` row the moment its threshold is first crossed — frozen forever (raising a threshold later never un-earns; ADR 0013). Catalog entries + per-tier ids already exist in `src/games/leksokipos/lib/achievements.ts`.

| id | Progress source | Thresholds |
|---|---|---|
| `leksokipos-kynigos-pangram-*` | **append-only set** of distinct pangrams found; count = set size | 10 / 20 / 50 |
| `leksokipos-syllektis-ponton-*` | lifetime `total_points` (append-forever `game_scores`; issue 03 fixed) | 1.000 / 10.000 / 25.000 |

**Progress = append-only sets, NEVER tallies (settled in grill; formalized in ADR 0013 as Lane C).**
- The "X / 10" a player sees is **computed, never stored**: it's the *size* of an append-only collection, not an integer that increments.
- `kynigos-pangram`: keep a set of distinct pangrams — e.g. rows `player_pangrams(device_uuid, puzzle_date, word)` UNIQUE, insert-if-absent (its own migration). Count = `COUNT(*)`. Re-syncing a puzzle re-inserts an existing pangram → no-op; two devices **union** on Restore (repoint, same as `player_achievements`); Offline-Lock duplicate flushes tolerated by the same rule. **Double-counting impossible by construction.** When count first crosses a threshold, write the tier fact row.
- **Why not `count = count + 1`:** a mutable counter re-introduces the exact clobber/double-count trap immutable facts avoid (retry posts twice; merges double-count). Sets are retry- and merge-safe.

**✅ `syllektis-ponton` retention bug fixed (2026-07-05, issue 03):** it needs *lifetime* `SUM(game_scores.score)`, which `/api/profile/stats` now reads over full history because `game_scores` is no longer pruned (the cron used to delete rows older than 10 days). ADR 0012's "append-forever" is now actually implemented, so this tier can be awarded correctly.

### 2. Relative / time-dependent achievements (Lane B — new)
Any award that depends on a value not final at end-of-game (e.g. leaderboard **placement** 1st/2nd/3rd) needs a **deferred server-side job at puzzle-close** that reads the final leaderboard and inserts the fact rows. Same `player_achievements` rows; no schema change. (Not in the current catalog; noted so the pattern is ready.) *(As of issue 03 `game_scores` is append-forever, so this job no longer races a prune — the leaderboard source stays intact indefinitely.)*

### 3. Additional stats / badges
- Cumulative "times reached level N" → same append-only-set pattern (a set of qualifying puzzle-dates).
- Any new badge = client (or Lane B) detection code + a new frozen catalog id. Adding an *id* needs **no migration**; adding a new *progress set* does need its own small table.

### 4. Unlock-moment UX
- Lightweight **toast on unlock**, reusing the deferred-toast infra from the Sign-in Restore welcome banner. **No confetti / no new npm dep** without approval.
- Mid-game unlocks toast immediately. No batched "since you were away" toasts (no backfill exists).

### 5. Richer badge display
- Inline Leaderboard badges beyond the existing 🏛️ Τζιμάνι glyph.
- A dedicated stats page (floated during the grill).

---

## Constraints (same as Epic A)

- Pure logic in `src/games/leksokipos/lib/` — zero React imports; testable.
- DB changes only via `supabase/migrations/` + `npx supabase db push`. New progress-set tables mirror `player_achievements`: open RLS, insert-if-absent, unioned on Restore, **never swept** by cleanup.
- No new npm dependencies (confetti etc.) without approval.
- Edge runtime for fetch-only API routes; no per-word hotpath cost (soul.md). Lane B jobs are once-per-day, not per-word.

## Suggested skills

- `/aihelper` — context reload
- `/prototype` — toast + leaderboard-badge + stats-page UI variations
- `/tdd` — implementation

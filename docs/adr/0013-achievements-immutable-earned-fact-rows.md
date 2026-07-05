# ADR 0013 — Achievements: immutable earned-fact rows, client-detected

**Status**: Accepted — refines the achievements storage sketch in ADR 0012 (confirms immutable rows over the Epic-A handoff's JSON-blob proposal) and inherits ADR 0012's `device_uuid` identity anchor.

## Context

Achievements Epic A ships the first 5 one-shot Leksokipos badges: they earn at end-of-game and light up in the Trophy Case (silent — no toast). The display catalog already ships as pure data (`src/games/leksokipos/lib/achievements.ts`) and `TrophyCase` already renders every tile locked. This ADR fixes the load-bearing calls before build: **storage shape, detection, merge-on-Restore, retention.**

Two proposals were in tension:

- **ADR 0012 Consequences** stated achievements are *"stored as immutable idempotent rows (`(device_uuid, achievement_id)` unique, `earned_at` never revoked)… awards are facts, not counters."*
- The **Epic-A handoff** sketched a single `player_stats(device_uuid, data jsonb)` blob per player (`data = { earned: [] }`), merged by a union-on-write function.

They contradict. The product constraint that breaks the tie is ADR 0012's: **"achievements are worthless if losable"** — so structural resistance to progress loss dominates. The blob's write is a whole-set *replace* (clobber risk under two-tabs / stale-device / fresh-device-with-empty-local); the rows model has no replace operation at all.

## Decision

1. **Storage — immutable rows.** `player_achievements(device_uuid text, achievement_id text, earned_at timestamptz default now())`, `UNIQUE(device_uuid, achievement_id)`. One row = one earned fact. Never updated, never revoked.
2. **Detection — client-side, at end-of-game**, in pure logic in `src/games/leksokipos/lib/achievements.ts` (add predicates for the 5 one-shots; zero React imports; testable). Same trust model as client-posted scores (client-detected, server-recorded, idempotent). **The server runs zero detection.**
3. **Earning — insert-if-absent.** `INSERT … ON CONFLICT (device_uuid, achievement_id) DO NOTHING`. There is **no operation that replaces or removes a set**, so "earned forever" holds *by construction*, not by a merge function. Clobber is impossible.
4. **Write RLS — open**, mirroring `game_state`'s `anon access` (`USING (true) WITH CHECK (true)`). End-of-game writes are anonymous and must also succeed for signed-in players. Deliberately **not** stored on `player_profiles`: its `UPDATE` policy is owner-scoped (`auth_user_id IS NULL OR auth_user_id = auth.uid()`) so an anonymous end-of-game write to a signed-in player's row would be rejected, and its `NOT NULL display_name` makes upsert-if-absent awkward.
5. **Sign-in Restore merge.** In `restore()` (`/api/auth/link`), **before** deleting the old device's profile row, re-point its achievements onto the canonical identity: `UPDATE player_achievements SET device_uuid = <canonical> WHERE device_uuid = <old>`, de-duplicated via the unique constraint (delete-then-repoint, or `ON CONFLICT DO NOTHING`). Mirrors `planScoreMerge`. This closes the one real progress-loss hole. The merge stays silent (union, nothing discarded — ADR 0012 §4).
6. **Retention — never swept.** `player_achievements` is lifetime / append-forever. `/api/cleanup-scores` sweeps `game_state` only and must never touch it. Same append-forever stance as `game_scores` and `identity_audit`.
7. **Display.** `/profile` fetches the earned `achievement_id`s for the device and lights the matching `TrophyCase` tiles; unearned stay locked. The 2 tiered badges (`kynigos-pangram`, `syllektis-ponton`) stay locked in Epic A.
8. **Recovery.** A botched merge or a link-time mapping overwrite is reconstructable via `identity_audit` (device→account history) — same break-glass path as score recovery (`docs/admin-restore.md`).

## Considered Options

- **Single JSON blob per player** `{ earned: [] }` (handoff sketch). Rejected for Epic A: every write replaces the whole set (clobber risk), needs a custom union-on-write function plus fetch-hydrate-before-push discipline, and contradicts ADR 0012. Its only edge — Epic B stat-sets sharing one row — is deferred, and counters are aggregates, not immutable facts.
- **Column on `player_profiles`.** Rejected: owner-scoped `UPDATE` RLS blocks anonymous end-of-game writes for signed-in players; `NOT NULL display_name` complicates upsert-if-absent; couples the identity table to a per-game hotpath.
- **Server-side detection.** Rejected: per-game server CPU (soul.md Fluid-CPU) with no security upside — same trust model as scores.

## Consequences

- **Adding a badge later** = a new frozen `achievement_id` string + a client predicate. No migration, no server change. Renaming/removing an id orphans earned rows (same freeze rule as Puzzle IDs, ADR 0012).
- The handoff's `player_stats(data jsonb)` table and its union-merge function are **dropped** in favour of `player_achievements` rows; the "add-don't-replace" concern dissolves (insert-if-absent cannot clobber).
- **Epic B** (tiered badges) needs progress counters (distinct-pangram sets, lifetime points). Those are **not** earned-fact rows and are out of scope here; Epic B chooses their store (a stats blob/column is reasonable there, where the write path can be designed for merge). `player_achievements` still holds the earned *tier* facts (`…-chalkino/-asimenio/-chryso` ids).
- **Three data classes, kept separate** (do not build a stats table that duplicates class 2): **(1) earned Achievement facts** — one-shot *and* tiered (a tier is its own frozen `achievement_id`) — live as `player_achievements` rows (this ADR); **(2) Lifetime Stats** (total points, puzzles played, Τζιμάνι count, Streak) are **derived from append-forever `game_scores`**, never stored (CONTEXT.md glossary); **(3) Epic B progress counters** that cannot be cheaply derived (e.g. lifetime distinct-pangram set) get their own store, designed in Epic B. "Badge" / "Trophy Case" are the visual token / surface of (1), never a separate store.
- The 🏛️ **Τζιμάνι leaderboard glyph stays independently derived** from `game_scores.is_perfect` — belt-and-suspenders against a missed client detection; self-heals on the next perfect game.
- **Extensible by design — the store is agnostic to writer and source.** `player_achievements` is keyed only by `(device_uuid, achievement_id)`, so it supports platform-wide and cross-feature awards (not just per-game), written from any hook. Detection has three lanes: **(A) client, live, at an event** (end-of-game, nomination-submit, …) — covers most; **(B) deferred server-side at puzzle-close** for **relative / time-dependent** signals whose value isn't final at end-of-game (e.g. 1st/2nd/3rd place) — a once-per-day job writes the same fact rows, and must award before the source score row is pruned; **(C) append-only set → size → crossing fact** for cumulative counts (Epic B tiers). Verified 2026-07-05 against hypotheticals (placement, 0-wrong-guesses, report-a-word) — all expressible. **Derivation is intentionally not a lane** (see next bullet).
- **Dependency flag — not Epic A's to fix, but blocks Epic B/stats.** `game_scores` is pruned at `SCORE_RETENTION_DAYS` (10) by `/api/cleanup-scores`, which **contradicts ADR 0012's "append-forever" intent** and makes `/api/profile/stats` a 10-day rolling total rather than a lifetime one. Achievement *facts* are immune (own table, never swept) — a core reason awards are stored, not derived. But anything deriving from `game_scores` lifetime history (Lifetime Stats today; Epic B's `syllektis-ponton` point tiers) is capped at the window. Resolve the append-forever contradiction before shipping point-based tiers or lifetime stats.
- **No backfill:** the DB hard-resets at launch; every device starts with zero achievement rows (TrophyCase already shows the beta-reset notice).

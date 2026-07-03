# Handoff: Achievements — Leksokipos Only (v1)

**Date:** 2026-07-02
**Status:** Rough sketch — needs a grill/brainstorm session before any design is settled
**Goal of next session:** grill the sketch below, decide the display surface, then update THIS doc until it is ready-for-agent (`/to-issues` → implementation)

**Prerequisite:** `.claude/handoffs/googleLoginIdentity.md` — durable identity must be settled first (achievements are worthless if losable). The merge problem decided there dictates what identity an achievement row keys on. Parent epic context: `.claude/handoffs/nemesisFeature.md`.

---

## The sketch (user's words, lightly structured)

**One-shot achievements:**
- Play your first game
- Reach the highest rank
- Make a 10-letter word
- Score 10k (lifetime — see reality check below)

**Progression (tiered) achievements — badges displayable on profiles:**
- Find 10 → 20 → 50 pangrams
- Find 80% of a puzzle's words
- Score 1k → 10k lifetime points → …

Scope: **Leksokipos only** for v1. Other games later.

---

## Reality checks from the codebase (verified 2026-07-02)

| Sketch item | Reality |
|---|---|
| "Score 10k" | Single-puzzle score is hard-capped at **600** (`src/config/gameRules.ts` — `MAX_SCORE_CAP`). So 1k/10k tiers are necessarily **lifetime cumulative points** — tracked nowhere today. Server could sum `game_scores` rows per player (daily puzzles only). |
| "Reach highest rank" | Ambiguous — glossary has TWO tops: **Απολυτότητα** (highest ladder Rank) and **Τζιμάνι** (secret rank, found ALL words, `is_perfect` flag). Sharpen into two achievements? Τζιμάνι already has a server-side signal: `game_scores.is_perfect` — retroactively backfillable. |
| "Find X pangrams" | Pangram finds are **never sent to the server**. Client knows (`isPangram` in game lib); `game_scores` POST carries only `score`. Needs new capture. Partial retro-backfill possible from `game_state` blobs (`{foundWords}`) — but only for ProfileLinked players' synced daily sessions. |
| "10-letter word" | Client-detectable at submit time (word length after normalisation). Not captured server-side today. |
| "80% of a puzzle's words" | Client knows `foundWords.length / validWords.length` live. Note the Endgame Zone already triggers at `score ≥ maxScore` — 80%-of-words is a *different* axis (count vs points); keep them distinct in naming. |
| "First game" | Derivable server-side from first `game_scores` row (or first score POST). |
| Badge display precedent | 🏛️ already marks Τζιμάνι players on the Leaderboard — there IS a precedent for badges on leaderboard rows. |
| "Profiles" to display badges on | **No profile page exists.** Profile today = ProfileSection inside leaderboard modals (name + transfer + Google). Displaying badges implies a new surface — this is the biggest unscoped piece. |

---

## Design questions for the grill (rough priority order)

1. **Display surface** — where do badges live?
   Options: (a) new profile modal/page reachable from ProfileSection, (b) badge icons inline on leaderboard rows (Τζιμάνι precedent), (c) both — tiny inline marks + full trophy case in profile. Probably prototype-worthy (`/prototype`).
2. **Detection point** — client fires "achievement unlocked" events to a new API, or server derives achievements from data it already receives (score posts, `pushFoundWords` sync)?
   Piggybacking on the existing `pushFoundWords` push (fires on every valid word for ProfileLinked players) may capture pangrams/word-length with **zero new client chatter** — but it only fires for ProfileLinked + daily. Watch the Vercel Fluid CPU constraint (soul.md): no new per-word API calls.
3. **Trust model** — achievements inherit the leaderboard's client-claimed trust (accepted risk per CONTEXT.md rate-limiting decision)? Or do lifetime counters get computed server-side from stored data only? Custom Puzzles are trivially farmable (player constructs the puzzle) — recommend: **daily puzzles only**, matching the Leaderboard exclusion rule.
4. **Retroactivity** — do existing players get backfilled? `is_perfect` rows → Τζιμάνι badge: yes, cheap. Lifetime points → sum of `game_scores`: yes. Pangram counts: mostly impossible historically. Decide whether counters start at backfilled values or zero.
5. **Data model** — likely a `player_achievements` table (identity key TBD by the identity handoff) + achievement definitions in code (a pure `src/games/leksokipos/lib/achievements.ts` catalog — definitions are content, not schema). Tiered progressions: one row per tier reached, or one row with current tier? Counters (pangrams found, lifetime points) may deserve their own `player_stats` row — counters and unlocks are different shapes.
6. **Unlock moment UX** — toast/confetti when unlocked mid-game? Batched "since you were away" on next open? Greek naming for every badge (the platform never uses English player-facing strings).
7. **Offline Lock interaction** — words found under Offline Lock flush late via the Offline Score Outbox; achievement detection must tolerate deferred/duplicate submission.
8. **Naming** — "Achievement" vs "Badge" for CONTEXT.md: proposal — **Achievement** = the earnable condition; **Badge** = its visual token shown on profile/leaderboard. Progression tiers need Greek names (extend the rank-ladder personality: Ψαράκι → Απολυτότητα tone).

---

## v1 Catalog — CANONICAL LOCATION

The reviewed v1 catalog (Leksokipos-only, frozen ids, Greek names, tier vocab **Χάλκινο → Ασημένιο → Χρυσό**) lives in **`profilePageAndAchievements.md` §4** — single source of truth to avoid drift. Do not fork it here. When implementation starts it lands as the pure `src/games/leksokipos/lib/achievements.ts` catalog (shape defined in §4).

Engine-side notes that inform detection (not in §4):
- **Identity key = DeviceId** for every earned row and counter (ADR 0012; CONTEXT.md Achievement/Lifetime Stats). Never `auth_user_id`.
- **Detection point (decided):** piggyback the existing `pushFoundWords` sync for word-derived awards (`sidirodromos` 10-letter, `theristis` 80%, `kynigos-pangram` counter) — no new per-word endpoint (soul.md Fluid-CPU). Server derives the rest from `game_scores` (`first-daily`, `tzimani` via `is_perfect`, `syllektis-ponton` via `SUM(score)`). Known gap accepted: anonymous / non-daily / non-ProfileLinked play doesn't capture word-derived counters — consistent with "losable until AuthLinked."
- **No backfill (decided):** the DB gets a **hard reset at launch**, so every unlock and counter starts at zero for everyone. No history-derived seeding, no "since you were away" grant storm on first post-ship open. Removes the whole backfill axis.
- **Data model (decided):**
  - `player_achievements(device_uuid, achievement_id, earned_at)` — unique `(device_uuid, achievement_id)`, immutable, **one row per tier** (per-tier frozen ids, §4). Idempotent inserts; merges can't double-count.
  - `player_stats(device_uuid, pangrams_found)` — the **only stored counter**; incremented via the `pushFoundWords` path (can't be derived from history).
  - **Lifetime points derived on read** from `SUM(game_scores.score)` (daily only) — no counter row.
- **Unlock-moment UX (decided):** lightweight **toast on unlock**, reusing the deferred-toast infra built for the Sign-in Restore welcome banner — **no confetti / no new npm dep**. Mid-game unlocks toast immediately; no batched backfill toasts exist (no backfill).
- **ADR candidate:** detection-point + no-backfill + one-row-per-tier is a real hard-to-reverse trade-off — write the ADR when the achievements epic starts implementation (not needed while it's a handoff).

## Constraints carried over

- Pure logic (achievement predicates, tier thresholds) in `src/games/leksokipos/lib/` — zero React imports; testable.
- DB changes only via `supabase/migrations/` + `npx supabase db push`.
- No new npm dependencies (confetti etc.) without approval.
- Edge runtime for fetch-only API routes; no per-word hotpath cost (soul.md performance rules).
- CONTEXT.md gets the Achievement/Badge glossary entries when terms crystallise; an ADR only if a real hard-to-reverse trade-off emerges (likely candidate: detection point / trust model).

---

## Definition of "ready for agent"

This doc is ready when it answers: identity key (from prerequisite handoff), display surface, detection point, trust model, retroactivity policy, data model, and a final v1 achievement list with Greek names + thresholds. Then run `/to-issues` to slice (likely: schema+catalog → detection wiring → profile/badge surface → unlock UX → backfill script).

## Suggested skills

- `/aihelper` — context reload at session start
- `/grill-with-docs` — work through the questions above; update CONTEXT.md inline as terms settle
- `/prototype` — UI variations for the badge display surface (question 1) if words don't settle it
- `/to-issues` — once ready-for-agent
- `/tdd` — implementation

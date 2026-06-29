# Handoff — Leksokipos Scoring Rework + Endgame Feature

**Date:** 2026-06-29  
**Branch:** dev  
**Next session goal:** Implement all decisions below — scoring constant changes, rank threshold updates, and the full Endgame Zone + Τζιμάνι feature.

---

## What was decided this session

### 1. Scoring constant changes (`src/config/gameRules.ts`)

| Constant | Old | New |
|---|---|---|
| `MAX_SCORE_CAP` | 500 | 600 |
| `SCORE_SCALE` | 0.8 | 0.85 |

`maxScore()` formula in `src/games/leksokipos/lib/scoring.ts` stays the same:
```
maxScore = min(ceil(rawTotal × SCORE_SCALE), MAX_SCORE_CAP)
```

### 2. Rank threshold changes (`src/games/leksokipos/lib/ranking.ts`)

| Rank | Old % | New % |
|---|---|---|
| Ψαράκι | 0% | 0% |
| Έτσι κιέτσι | 6% | 8% |
| Οκέι | 12% | 16% |
| Για πάμε | 20% | 24% |
| Θηρίο | 30% | 35% |
| Φωτιά | 42% | 45% |
| Γκουρού | 55% | 60% |
| Απολυτότητα | 80% | 80% |

Only the `threshold` values in the `RANKS` array change — names and emojis stay the same.

### 3. Endgame Zone

**Trigger:** `score >= maxScore` — daily puzzles only (not Custom Puzzles).

**UI location:** The 3-bars `RankIcon` button in `src/components/leksokipos/ScoreBar.tsx` currently toggles a rank-ladder popup (`showRanks`). When endgame is active, this popup is replaced entirely by the endgame panel. No toggle back to the rank ladder — the player is permanently past it.

**Endgame panel content (in this order):**
1. Total Valid Words remaining
2. Pangrams remaining
3. Word count per length, descending (e.g. 8γρ → 2 | 7γρ → 4 | 6γρ → 5 | 5γρ → 3 | 4γρ → 1)

No hints — pure counts only. No first-letter hints, no word shapes.

**Rank label on button:** Stays "Απολυτότητα 💯" — no visual change to the button/label when endgame unlocks.

**Panel state on reload:** Endgame unlocks whenever `score >= maxScore`. Since `score` is already persisted in `LeksokiposRoundSnapshot`, no extra persistence is needed — the panel re-appears naturally on refresh.

### 4. Τζιμάνι 🏛️ (true completion)

**Trigger:** 0 Valid Words remaining (player has found every word).

**"ΤΟ ΠΕΘΑΝΕΣ" message:** Displayed in the word-feedback area — the zone above the 7 letter tiles where validation messages (e.g. "Πανόγραμμα! +7") currently appear. This fires as the celebration moment.

**Input:** Disable the letter input entirely once 0 words remain. The letter tiles and hive/flower grid can remain visible but non-interactive.

**Rank identity:** Secret — Τζιμάνι never appears in the rank ladder or rank button label. It is only reflected in the leaderboard marker (see below) and the "ΤΟ ΠΕΘΑΝΕΣ" message.

**Leaderboard marker:** A 🏛️ emoji should appear next to the player's leaderboard row when they have achieved Τζιμάνι. This is extremely rare in practice.

---

## Open question — Q17 (decide before implementing leaderboard marker)

**How to store Τζιμάνι on the leaderboard?**

The `game_scores` table has no "perfect game" flag. Options:
- **Recommended:** Add `is_perfect bool default false` column to `game_scores` via a new migration file in `supabase/migrations/`, applied with `npx supabase db push`. Clean, queryable, explicit.
- **Alternative:** Skip the DB change entirely — the 🏛️ marker is so rare it could be deferred or omitted for now.

Decide at implementation time. If adding the column, follow the DB schema rules in `CLAUDE.md` (new migration file + push, never via dashboard).

---

## Files to touch

| File | Change |
|---|---|
| `src/config/gameRules.ts` | `MAX_SCORE_CAP` 500→600, `SCORE_SCALE` 0.8→0.85 |
| `src/games/leksokipos/lib/ranking.ts` | Update `threshold` values in `RANKS` array |
| `src/components/leksokipos/ScoreBar.tsx` | Replace rank popup with endgame panel when `score >= maxScore`; disable input + show "ΤΟ ΠΕΘΑΝΕΣ" when 0 words remain |
| `src/games/leksokipos/types.ts` | Possibly extend `GameState` with derived endgame flags (assess during implementation) |
| `supabase/migrations/` | New migration for `is_perfect` column (if Q17 → DB path) |
| `.claude/issue-tracker/issues/04-td002-max-score-cap.md` | **Delete** — resolved by this work |
| `CONTEXT.md` | Already updated this session (Rank ladder corrected, Endgame Zone + Τζιμάνι added, Max Score definition updated) |

---

## Standing rules (from `CLAUDE.md`)

- Run `npm run test -- --run`, `npx eslint .`, and `npm run build` after every meaningful change. All must pass.
- **PowerShell only** — use `Select-Object -Last N`, never `tail`.
- Game logic in `src/games/*/lib/` must stay pure functions — zero React imports.
- No new dependencies without explicit approval.
- DB changes: new migration file + `npx supabase db push` — never via dashboard.

---

## Suggested skills

- `/tdd` — the scoring and ranking changes are pure-function territory; ideal for red-green-refactor with existing test coverage
- `/aihelper` — full context reload at session start (reads all `.claude/aiHelper/` files)
- `/diagnose` — if any existing tests break after the rank threshold or score cap changes

# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 35 — 2026-05-26: Architecture Refactoring (Candidates 1 + 2) ✅

### Changes

1. **`src/hooks/useGameIdentity.ts`** (new) — SSR-safe hook that owns DeviceId + DisplayName initialisation (`useState` lazy initialiser with `typeof window` guard). Replaces three divergent identity patterns: `useState` in GameBoard, `useReducer + useEffect` in LeksiarxeioBoard and ConnectionsBoard.

2. **Board updates** — All three boards now call `useGameIdentity()`. LeksiarxeioBoard calls `migrateLeksiarxeioIdentity()` synchronously before the hook so the legacy UUID is promoted before `getOrCreateDeviceId()` can create a fresh one (idempotent, safe during render). Removed inline `identityReducer` from ConnectionsBoard.

3. **`src/hooks/useScoreSubmission.ts`** — Extended to cover all three games. Added `gameId: "leksiarxeio"` and `submitLength(length, attempts, won)` which posts to `/api/leksiarxeio-scores` and maps `won=false → attempts=7` penalty. Deleted `useLeksiarxeioScoreSubmission.ts`.

4. **`src/components/leksiarxeio/LeksiarxeioBoard.tsx`** — Switched from `useLeksiarxeioScoreSubmission` to `useScoreSubmission({ gameId: "leksiarxeio", ... })` using `submitLength`.

5. **Test cleanup** — Deleted `useLeksiarxeioScoreSubmission.test.ts` (replaced by `submitLength` tests in shared file). Deleted `useLeksindeseisScoreSubmission.test.ts` (8/9 tests were exact duplicates of shared file; 1 unique test moved to `useScoreSubmission.test.ts`).

6. **`src/test/shared/useGameIdentity.test.ts`** (new) — 9 tests: initial values from store, UUID format, setter isolation.

7. **Docs** — README.md and memory.md updated for accuracy. Exact test counts removed from all persistent docs.

---

## Session 34 — 2026-05-24: FlowerGrid Variant Presets + Prod Toggle ✅

### Changes

1. **`FlowerGrid.tsx`** — `DEFAULT_CONFIG` replaced by `DEFAULT_PIE_CONFIG` (annular sectors) and `DEFAULT_FLOWER_CONFIG` (elliptical petals) named presets. `DEFAULT_CONFIG = DEFAULT_PIE_CONFIG` alias preserved.

2. **`FlowerGridPlayground.tsx`** — Added `variant?` prop; prod mode renders with the matching preset. Design-panel variant toggle resets to full preset. `isDesignMode` detection moved to `useSyncExternalStore` (fixes `react-hooks/set-state-in-effect`).

3. **`LeksokiposLayout.tsx`** (new) — Client wrapper holding variant state via `useSyncExternalStore` + module-level pub/sub. Toggle button in header persists preference to `leksokipos-variant` localStorage key.

4. **`LeksokiposLayout.test.tsx`** (new) — 11 tests: header render, variant toggle, localStorage save/restore, tooFewWords warning.

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 33 | 2026-05-23 | Internal identifier rebranding: `useWordleScoreSubmission` → `useLeksiarxeioScoreSubmission`, `useConnectionsScoreSubmission` → `useLeksindeseisScoreSubmission`, all component/hook/type renames to match Greek game names. Puzzle ID strings intentionally unchanged (localStorage compat). |
| 32 | 2026-05-23 | `FlowerGrid.tsx` — SVG flower grid (teardrop petals, arc-join to center circle, `active:scale-95` press feedback). Replaced `HoneycombGrid` in GameBoard. |
| 31 | 2026-05-22 | Platform rebrand: Spelling Bee → Leksokipos, Wordle GR → Leksiarxeio, Connections → Leksindeseis. Greek rank names. All routes, slices, and components renamed. |
| 30 | 2026-05-22 | Connections leaderboard: `POST/GET /api/connections-scores`, `useConnectionsScoreSubmission`, `ConnectionsLeaderboardModal`, `ConnectionsBoard` extracted to `src/components/`. |
| 29 | 2026-05-22 | `postScore` + `upsertAndClean` shared libs; `useWordleScoreSubmission` refactored to use them. |
| 28 | 2026-05-22 | `useRoundPersistence` replaces 3 per-game persistence patterns. |
| 27 | 2026-05-22 | `CONTEXT.md` created (domain glossary). `Puzzle` → `SpellingBeePuzzle`, `getCuratedPuzzleByLetters` → `getPrebuiltPuzzleByLetters`. |
| 26 | 2026-05-21 | `flex-1 aspect-square` tiles with per-length `max-w-*`; `WordleHeader` extracted; 🏆 in header. |
| 25 | 2026-05-21 | Vercel Fluid CPU mitigations: `validWordsCache`, ISR `revalidate=3600`, Edge runtime on all API routes. |
| 24 | 2026-05-20 | `isDailyPuzzle` + `isISODate` single-source; replaced 4 inline regexes. |
| 23 | 2026-05-20 | `useScoreSubmission` + `useWordleScoreSubmission`; `useLeaderboard` `buildUrl` param. |
| 22 | 2026-05-20 | Spelling Bee Give-Up: confirm → locked game → missed words revealed; `givenUp` persisted. |
| 21 | 2026-05-19 | `maxScore` hard-capped at 500 pts (`MAX_SCORE_CAP`). |
| 20 | 2026-05-19 | Leaderboard 7-day pill strip; routing fix (`getPuzzleForDate`); DB cleanup on POST. |
| 19 | 2026-05-18 | Leaderboard `max={today}`; display-name RLS fix. |
| 18 | 2026-05-18 | `getCuratedPuzzleByLetters()`; shared `styles.ts` tokens; 🏆 button. |
| 17 | 2026-05-18 | Per-puzzle leaderboard: `POST/GET /api/scores`, `useLeaderboard`, `LeaderboardModal`, Supabase `scores`. |
| 16 | 2026-05-18 | Supabase word suggestions: `getSupabaseClient()`, `getOrCreateDeviceId()`, `POST /api/suggest-word`. |
| 15 | 2026-05-15 | `SuggestWordModal`; `suggestions.ts`; inline ⏎ submit; landing page rewrite. |
| 14 | 2026-05-14 | Puzzle quality filter (`meetsQuality`, `hasPangram`); `puzzles-el.json` regenerated (1008 puzzles). |
| 1–13 | 2026-05-12–14 | Foundation (shell, routing, persistence, types) · Wordle GR · Theming · Connections · Greeklish URLs · Mobile · No-accent invariant · Test gap fill. |

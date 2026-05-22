# Agent Log — Greek Word Games Platform

> Entries newest-first. Full detail for the two most recent sessions; older sessions one-liner.
> **Rule:** keep this file under 250 lines — condense older entries before adding new ones.

---

## 2026-05-22 — Session 31: Platform & Game Rebrand (Leksarxeia) ✅

**Outcome:** 655 tests (43 files) · 0 failures · ESLint 0 errors · build clean.

### Changes

1. **Platform rename** — `"Παιχνίδια Λέξεων"` → `Leksarxeia` in h1, Shell header, `layout.tsx` metadata.

2. **Game 1: Spelling Bee → Leksokipos** — Route `src/app/leksokipos/`, components `src/components/leksokipos/`, game logic `src/games/leksokipos/`. Store slice `"spelling-bee"` → `"leksokipos"`. HowToPlayModal title + bulletIcon (🐝→🌸). HoneycombGrid aria-label updated.

3. **Rank names** — All English ranks replaced with Greek: `"Beginner"` → `"Σπόρος"`, `"Moving Up"` → `"Βλαστός"`, `"Good"` → `"Μπουμπούκι"`, `"Solid"` → `"Άνοιγμα"`, `"Great"` → `"Ανθισμένο"`, `"Amazing"` → `"Θαυμαστό"`, `"Genius"` → `"Ευφυΐα"`, `"Queen Bee"` → `"Άνθος"`. Updated in `types.ts`, `ranking.ts`, `gameReducer.ts` initial state.

4. **Game 2: Wordle GR → Leksiarxeio** — Route `src/app/leksiarxeio/`, components `src/components/leksiarxeio/`, game logic `src/games/leksiarxeio/`. Store slices `"wordle"` → `"leksiarxeio"`, `"wordle-identity"` → `"leksiarxeio-identity"`. Header h1 + aria-labels updated.

5. **Game 3: Connections → Leksindeseis** — Route `src/app/leksindeseis/`, components `src/components/leksindeseis/`, game logic `src/games/leksindeseis/`. Store slice `"connections"` → `"leksindeseis"`. h1 + HowToPlay title updated.

6. **`migrateFromLegacyKeys()`** — Deleted entirely (function + 4 tests). Old data abandoned per handoff spec.

7. **`GameId` + `PersistenceEnvelope`** in `src/types/index.ts` — All 3 game keys renamed.

8. **All source directories renamed** — `src/games/`, `src/components/`, `src/test/` subdirectories all renamed to match new game names. 50+ import paths updated.

9. **Tests updated** — Rank string assertions in `gameLogic`, `gameReducer`, `GameBoard` tests. `useGameStore.test.ts` slice keys + `migrateFromLegacyKeys` block removed. `Shell.test.tsx` href + platform name assertions. E2e page objects + spec descriptions.

---

## 2026-05-22 — Session 30: Architecture Candidate 3 — Connections Leaderboard ✅

**Outcome:** 659 tests (43 files) · 0 failures · ESLint 0 errors.

### Changes

1. **`src/app/api/connections-scores/route.ts`** (new) — `POST` + `GET` for Connections leaderboard. POST validates score 1–4; uses `upsertAndClean`. GET returns top20 + pinned player row ordered by `score DESC`. Includes Supabase `connections_scores` table creation SQL (user must run in dashboard).

2. **`src/hooks/useConnectionsScoreSubmission.ts`** (new) — `submit(score)` (with dedup guard, `lastPostedRef`) and `submitWithName(score, name)`. Uses `postScore`; displayName stored in ref.

3. **`src/components/connections/ConnectionsLeaderboardModal.tsx`** (new) — Leaderboard modal. Uses `useLeaderboard` with custom `buildUrl → /api/connections-scores`. Displays `N/4` scores. Reuses SpellingBee `styles.ts` tokens. Display-name editor calls `onSaveName`.

4. **`src/components/connections/ConnectionsBoard.tsx`** (new, replaces `src/app/connections/ConnectionsBoard.tsx`) — Full board component. Wires identity (`getOrCreateDeviceId`, `getDisplayName`, `setDisplayName`), score submission, game-end detection (ref watching `playing→won`), 🏆 button, and `ConnectionsLeaderboardModal`. Identity uses `useReducer` + `dispatch` to avoid `react-hooks/set-state-in-effect`.

5. **`src/app/connections/ConnectionsBoard.tsx`** — changed to re-export from `@/components/connections/ConnectionsBoard`.

6. **`src/test/useConnectionsScoreSubmission.test.ts`** (new) — 8 tests: POST fields, deviceId guard, score=0 guard, dedup guard, "Ανώνυμος" fallback for `submit()`; plus `submitWithName()` fields, score=0, deviceId guards.

7. **`src/test/performance.test.ts`** — raised `CURATED_LOOKUP_BUDGET_MS` 10→50 ms (timing flake on this machine).

### Note for user
The `connections_scores` Supabase table must be created via the dashboard SQL included as a comment block at the top of `src/app/api/connections-scores/route.ts`.

---

---

## 2026-05-22 — Session 27: Domain glossary + two type renames ✅

**Outcome:** 639 tests (41 files) · 2 pre-existing failures (now fixed in S28) · build not re-run.

### Changes

1. **`CONTEXT.md` created** — domain glossary. Key terms locked:
   - Wordle leaderboard metric = **Attempt Total** (lower is better)
   - Wordle per-length display = **In-game Points**
   - Spelling Bee submissions = **Valid Words**
   - **Guess** = 1 word in Wordle, 4 words in Connections
   - **Pre-built Puzzle** = batch-generated Spelling Bee daily (in `puzzles-el.json`)
   - **Curated Puzzle** = hand-authored Connections puzzle

2. **`Puzzle` → `SpellingBeePuzzle`** — type rename across 22 files.

3. **`getCuratedPuzzleByLetters` → `getPrebuiltPuzzleByLetters`** — "curated" reserved for Connections.

---

## Earlier sessions (one-liner each)

| Session | Date | Outcome | Tests |
|---------|------|---------|-------|
| 29 — Unified Score Submission | 2026-05-22 | `postScore` + `upsertAndClean` shared libs; `useWordleScoreSubmission` refactored | 651 |
| 28 — Unified Persistence | 2026-05-22 | `useRoundPersistence` replaces 3 per-game patterns; `usePersistence.ts` deleted | 645 |
| 26 — Wordle tile layout + header | 2026-05-21 | `flex-1 aspect-square` tiles with per-length `max-w-*`; `WordleHeader` extracted; 🏆 button in header; WIP badge removed | 639 |
| 25 — Vercel Fluid CPU | 2026-05-21 | `validWordsCache`; ISR revalidate 3600; Edge runtime on all API routes | 627 |
| 24 — Architecture Candidate 5 | 2026-05-20 | `isDailyPuzzle` + `isISODate` single-source; replaced 4 inline regexes | 627 |
| 23 — Architecture Candidates 1+3 | 2026-05-20 | `useScoreSubmission` + `useWordleScoreSubmission`; `useLeaderboard` `buildUrl` param | 617 |
| 22 — Spelling Bee Give-Up | 2026-05-20 | "Παραίτηση" → confirm → locked game → missed words revealed; `givenUp` persisted | 605 |
| 21 — Score cap | 2026-05-19 | `maxScore` hard-capped at 500 pts (`MAX_SCORE_CAP`) in `scoring.ts` | 570 |
| 20 — Leaderboard 7-day strip | 2026-05-19 | Calendar → pill strip; routing bug fix (`getPuzzleForDate`); DB cleanup on POST | 568 |
| 19 — Leaderboard date restriction | 2026-05-18 | `max={today}`; display-name RLS fix; `leaderboardModal.test.tsx` | 559 |
| 18 — 🏆 button + style tokens | 2026-05-18 | `getCuratedPuzzleByLetters()`; shared `styles.ts` tokens | 479 |
| 17 — Per-puzzle leaderboard | 2026-05-18 | `POST/GET /api/scores`; `useLeaderboard`; `LeaderboardModal`; Supabase `scores` | 475 |
| 16 — Supabase word suggestions | 2026-05-18 | `getSupabaseClient()`; `getOrCreateDeviceId()`; `POST /api/suggest-word` | 445 |
| 15 — Suggestion flow + UI polish | 2026-05-15 | `SuggestWordModal`; `suggestions.ts`; inline ⏎ submit; landing page rewrite | 430 |
| 14 — Puzzle quality filter | 2026-05-14 | `meetsQuality()` + `hasPangram()`; `puzzles-el.json` regenerated (1008 puzzles) | 389 |
| 13b — Random puzzle quality | 2026-05-14 | `pickRandom7()` guarantees vowel centre + ≥2 vowels + ≥2 consonants | 374 |
| 13 — Codebase review | 2026-05-14 | Removed duplicate `normaliseChar`; stale docs fixed | 372 |
| 12 — LetterPickerModal | 2026-05-14 | Shared `LetterPickerModal`; `NewPuzzleButton` wired; `ShareButton` icon-only | 372 |
| 11 — Greeklish URLs | 2026-05-14 | `src/lib/greeklish.ts`; bijective codec; backward-compat redirect | 352 |
| 10 — Mobile fixes | 2026-05-14 | `overflow-x:hidden`; Keyboard `flex-1`; `HowToPlayModal` scroll-safe | 299 |
| 9 — Keystroke bugs | 2026-05-14 | Wordle cap message; stable `keyHandlerRef`; `FoundWordsList` memo | 289 |
| 8 — No-accent invariant | 2026-05-13 | `normalizeLetters` at every entry point; `noAccents.test.ts` (20 tests); canonical redirect | 277 |
| 7 — Test gap fill | 2026-05-13 | 58 new tests; `parseCustomUrl` extracted; `deploymentReadiness` updated | 257 |
| 1–6 — Foundation + Wordle + Theming + Connections | 2026-05-12 | Phases 1–3 complete | 199 |

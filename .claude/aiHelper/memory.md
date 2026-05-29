# Agent Memory — Greek Word Games Platform

## ⚡ Current State (2026-05-26)
Three live games + custom puzzle URLs. Run `npm run test -- --run` for current count.

| Game | Route | Status |
|------|-------|--------|
| Leksokipos | `/leksokipos` + `/leksokipos/[center]/[outer]` | Live — daily + custom URL |
| Leksiarxeio | `/leksiarxeio` | Live — 4–8 letter Greek, multi-length |
| Leksindeseis | `/leksindeseis` | Live — hand-curated |

---

## 🔒 Locked Architecture Decisions (do not re-litigate)

| Topic | Decision |
|-------|----------|
| **Routing** | `/leksokipos`, `/leksiarxeio`, `/leksindeseis`, `/` picker. Custom: `/leksokipos/[center]/[outer]` |
| **Persistence** | Single `wordgames:state` key. `useGameStore` is the ONLY localStorage writer. Exception: `leksokipos-variant` standalone key (display pref, not game state). |
| **Types** | Root `src/types/index.ts` = `Language`, `GameId`, `PersistenceEnvelope` only. Game types in `src/games/*/types.ts`. |
| **Theming** | All pages = white/light mode by default. Manual dark/light toggle in Shell header (☀️/🌙). `.dark` class on `<html>` drives all dark styles — `prefers-color-scheme` NOT used. `dark:` Tailwind prefix is enabled via `@custom-variant dark` in `globals.css` (see ADR 0002). Preference stored in `localStorage` key `"theme-preference"`. Style tokens in `src/components/leksokipos/styles.ts`. Feedback colours (green/yellow tile states, difficulty colours) unchanged in dark mode. |
| **Game logic** | Pure functions in `src/games/*/lib/` — zero React imports. |
| **Shared components** | Graduate to `src/components/shared/` only when 2 games genuinely need it. |
| **Leksindeseis** | No `language` field on `LeksindeseisPuzzle`; identified by `date` alone. |
| **Custom puzzle ID** | `custom-{center}-{sortedOuter}` — not date-scoped. |
| **No Greek accents** | Zero accents in URLs, stored state, puzzle letters, valid-word output. `normalizeLetters()` is the single normalisation point. |
| **Custom URL** | Greeklish bijective codec (`src/lib/greeklish.ts`). Canonical 301 redirect on unnormalised params. |
| **Supabase** | Singleton in `src/lib/supabase.ts`. `getOrCreateDeviceId()` generates stable UUID stored under `deviceId` in the envelope. See `CONTEXT.md` for current DB schema (table list grows as games are added). |
| **Profile identity** | No PIN. Profile = device_uuid row in `player_profiles`. Cross-device: generate 6-char transfer code via `POST /api/transfer`, claim on other device via `POST /api/transfer/claim`. `useProfile` hook shared across all 3 games. `ProfileSection` component shared in `src/components/shared/`. |
| **Leaderboard** | Per-puzzle daily only. Silent upsert on score increase. 7-day rolling window. Custom puzzles excluded. |
| **Leaderboard navigation** | Rolling 7-day pill strip. `getRecentPuzzleDates(7)` server-side. |
| **Future renames** | UI strings only — never directories, types, or routes. |
| **FlowerGrid themes** | `DEFAULT_PIE_CONFIG` + `DEFAULT_FLOWER_CONFIG` presets. Toggle in `LeksokiposLayout` header. |

---

## 📁 Folder Structure

```
src/
  app/          Routes + server components (leksokipos, leksiarxeio, leksindeseis, api/)
  components/   shared/ · leksokipos/ · leksiarxeio/ · leksindeseis/
  games/        Pure logic: leksokipos/lib+hooks · leksiarxeio/lib+hooks · leksindeseis/hooks
  data/         leksokipos/puzzles-el.json · leksiarxeio/words-{4..8}.json · leksindeseis/puzzles-connections.json · words-el.json
  hooks/        useGameStore · useGameIdentity · useScoreSubmission · useRoundPersistence · useGameStateSync · useLeaderboard · useProfileVerification · useProfile · useLeaderboardProfile · useTheme
  lib/          greeklish.ts · postScore.ts
  types/        index.ts
  test/         organised by game + shared/
```

---

## 🛠 Known Tech Debt
Tracked in `.claude/issue-tracker/issues/`. See that directory for status per item.

---

## 🧪 Test Coverage Map

> Before writing a new test, grep the `describe` column. If the function appears, read that file first.

| File | What is tested |
|------|----------------|
| `evaluateGuess.test.ts` | Two-pass Wordle evaluation — correct/present/absent/duplicate |
| `leksiarxeioReducer.test.ts` | ADD_LETTER, DELETE_LETTER, SUBMIT_GUESS (win/loss/invalid), RESTORE_STATE |
| `gameLogic.test.ts` (leksiarxeio) | `scoreLeksiarxeio`, `buildLetterStateMap` |
| `guessGrid.test.tsx` | Tile rendering, max-width per length |
| `header.test.tsx` | LeksiarxeioPageClient — 🏆, HowToPlay, scoring note |
| `theme.test.tsx` | Tile + Keyboard **light** theme classes (empty/pending/unknown states) |
| `dataLoader.test.ts` (leksiarxeio) | `getTodaysLeksiarxeioPuzzle`, `getAllTodaysLeksiarxeioPuzzles`, `getValidWords` |
| `gameLogic.test.ts` (leksokipos) | `isPangram`, `scoreWord`, `maxScore`, `calculateRank`, `validateWord` |
| `gameReducer.test.ts` | All reducer actions incl. SUBMIT_WORD, RESTORE_STATE |
| `GameBoard.test.tsx` | Rendering, keyboard, hex clicks, word submission, feedback |
| `LeksokiposLayout.test.tsx` | Variant toggle (pie↔flower), localStorage save/restore, tooFewWords |
| `greekLogic.test.ts` | Same logic functions with Greek Unicode — proves no ASCII assumptions |
| `greeklish.test.ts` | Bijective Greek↔greeklish codec round-trip |
| `leksokiposDataLoader.test.ts` | `getPuzzleForDate`, `getPuzzleById`, `getRandomPuzzle`, `getNextPuzzle` |
| `leksokiposRouting.test.ts` | Canonical URL round-trip for all pre-built puzzles |
| `computeValidWords.test.ts` | `computeValidWords` — inclusion, too-short, missing center, normalisation |
| `customPuzzle.test.tsx` | `buildCustomPuzzle` + `ShareButton` |
| `parseCustomUrl.test.ts` | `parseCustomUrl` — valid, invalid center/outer, uniqueness |
| `normalize.test.ts` | `normalizeLetters` — accents, ς→σ, edge cases |
| `noAccents.test.ts` | Accent-free invariant across puzzles, reducer, URL params |
| `leksindeseisReducer.test.ts` | SELECT_WORD, SUBMIT_GUESS (correct/wrong/one-away), terminal guard |
| `groupGrid.test.tsx` | Render, solved groups, selection, disabled |
| `dataLoader.test.ts` (leksindeseis) | `getTodaysLeksindeseisPuzzle` — date match, fallback, shape |
| `persistence.test.ts` | `useRoundPersistence` — hydration, saving, clear(), shouldSave |
| `useScoreSubmission.test.ts` | Unified hook — submit/submitWithName (Leksokipos+Leksindeseis) + submitLength with penalty (Leksiarxeio) |
| `useGameIdentity.test.ts` | SSR-safe DeviceId + DisplayName init, setter state updates |
| `useGameStore.test.ts` | readSlice, writeSlice, clearSlice, deviceId, displayName, profileLinked, migration |
| `Shell.test.tsx` | Hamburger open/close/Escape, nav links, theme toggle (aria-label, `.dark` class on `documentElement`) |
| `letterPickerModal.test.tsx` | Center/outer selection, quality rules (vowel center, ≥2 vowels, consonants) |
| `feedbackMessage.test.tsx` | Valid/pangram/error statuses, suggest button |
| `nominationModal.test.tsx` | NominationModal — visibility, word field (readonly + editable), direction copy, close, POST payload, success/error states |
| `suggestions.test.ts` | `getSuggestedWords`, `markSuggested`, `isSuggested` |
| `wordInput.test.tsx` | Letter display, center-letter highlight, inline submit visibility |
| `deploymentReadiness.test.ts` | Statically imported data files exist and are not gitignored |
| `profileRoute.test.ts` | `GET /api/profile?device_uuid=` (exists/not/error) + `POST /api/profile` (upsert, 400 missing uuid) |
| `transferRoute.test.ts` | `POST /api/transfer` (code format, 400, 500) + `POST /api/transfer/claim` (valid, 404/410 used/expired, empty profile) |
| `leaderboardModal.test.tsx` | Day strip, play link, ProfileSection (idle/claiming/linked/transfer), name editor |

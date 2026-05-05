# 🍯 Spelling Bee (Greek)

A browser-based word game inspired by the NYT Spelling Bee, built for Greek language play.
Built with **Next.js 16 · TypeScript · Tailwind CSS · Vitest**.

---

## How to run

```bash
npm install
npm run dev        # development server → http://localhost:3000
npm run build      # production build
npm run start      # serve production build
npm run test       # run all tests (Vitest)
npm run test:watch # watch mode
npm run lint       # ESLint
```

### Puzzle generation scripts

```bash
# Parse a Hunspell .dic file into a words-el.json word list
npm run parse-dict -- --lang=el

# Generate a single puzzle manually
npm run generate-puzzle -- --lang=el --center=α --outer=π,ο,λ,ε,μ,σ --date=2026-03-26

# Batch-generate many puzzles and append to puzzles-el.json
npm run batch-generate -- --target=200 --min-words=50 --lang=el
```

---

## How the game works — step by step

1. **Puzzle load** (`src/app/page.tsx` — server component)
   - The server reads `?lang=`, `?puzzle=` and `?random=` query params.
   - It calls `getPuzzleById` or `getRandomPuzzle` from `src/data/index.ts`.
   - The resolved `Puzzle` object is passed as a prop to `<GameBoard>`.

2. **State initialisation** (`src/hooks/gameReducer.ts → buildInitialState`)
   - A clean `GameState` is built: empty input, zero score, Beginner rank.
   - `puzzleMaxScore` is computed once here (see Scoring below) and stored in state so it never needs to be recalculated.

3. **Client rehydration** (`src/hooks/useGameState.ts`)
   - After first render, `loadPersistedState` checks `localStorage` for a saved session matching the puzzle ID.
   - If found, a `RESTORE_STATE` action merges the saved fields (found words, score, rank) back into state.

4. **Player input**
   - Hex cells (`<HoneycombGrid>`) call `addLetter` on click.
   - Physical keyboard events are handled by `handleKeyboardLetter` (normalises accented input → base letter, then filters against the puzzle's allowed set). This logic lives entirely in `useGameState` — `<GameBoard>` is a pure event dispatcher.
   - Backspace → `deleteLetter`, Enter → `submitWord`.

5. **Word submission** (`src/hooks/gameReducer.ts → SUBMIT_WORD`)
   - `validateWord` (pure, `src/lib/validation.ts`) runs 5 rules in order: length ≥ 4, letters in puzzle set, contains centre letter, in valid word list, not already found.
   - A puzzle index (letter sets + valid word set) is built once per puzzle ID and cached in a module-level Map — never rebuilt on subsequent submissions.
   - If valid: score is updated, rank is recalculated via `calculateRank`, word is added to `foundWords`.

6. **Scoring** (`src/lib/scoring.ts`)
   - 4-letter word → 1 pt
   - 5+ letter word → 1 pt per letter
   - Pangram (uses all 7 letters) → above + 7 bonus pts
   - `maxScore` = sum of all word scores × 0.8 (capped at 80% of the raw total so rank thresholds are reachable without finding every obscure word).

7. **Rank calculation** (`src/lib/ranking.ts`)
   - Score is compared against thresholds as a % of `maxScore`:

   | Rank      | Threshold |
   |-----------|-----------|
   | Beginner  | 0%        |
   | Moving Up | 6%        |
   | Good      | 12%       |
   | Solid     | 20%       |
   | Great     | 30%       |
   | Amazing   | 42%       |
   | Genius    | 55%       |
   | Queen Bee | 80%       |

   `rankProgress()` (pure function) derives the progress-bar fill, points-to-next and the full ladder for the UI — keeping all rank display logic out of React components.

8. **Persistence** (`src/hooks/usePersistence.ts`)
   - On every state change, `foundWords`, `score`, `currentRank` and `startedAt` are written to `localStorage` under key `spelling-bee:state`.
   - State is tied to a `puzzleId` — switching puzzles automatically discards the old session.

9. **UI composition** (`src/components/GameBoard.tsx`)
   - `<ScoreBar>` — rank label, progress bar, rank ladder popover (click the bars icon).
   - `<WordInput>` — live letter display, centre letter highlighted in yellow.
   - `<FeedbackMessage>` — toast after each submission.
   - `<HoneycombGrid>` — 7 hexagonal letter cells.
   - `<FoundWordsList>` — sorted found words, pangrams highlighted.
   - `<HowToPlayModal>` — rules modal (? button, Greek only).

---

## Architecture

```
src/
  app/          Next.js App Router — server entry, layout
  components/   React UI components (display only, no game logic)
  hooks/        useGameState (React) + gameReducer (pure) + usePersistence
  lib/          Pure game logic: validation, scoring, ranking, normalisation
  data/         Puzzle JSON files + data access layer
  types/        Shared TypeScript interfaces
  test/         Vitest + React Testing Library test suite
scripts/        Puzzle generation CLI scripts (Node/tsx)
```

**Key design principle:** game logic (`src/lib/`, `src/hooks/gameReducer.ts`) is completely decoupled from React. Every function in `src/lib/` is a pure function with no framework dependency — testable with plain Vitest, no DOM required.

---

## High scores / leaderboard

**Currently not implemented.**

Scores are persisted in `localStorage` per device only — one active session per puzzle per browser. There is no cross-device or cross-player leaderboard.

See Tech debt #1 below.

---

## Tech debt

| # | Area | Description |
|---|------|-------------|
| 1 | **Per-puzzle leaderboard** | No cross-player high scores exist. The design has been discussed: each player would get a device UUID + name stored locally; scores would be written to a backend (Supabase recommended) via `POST /api/scores`; the current puzzle leaderboard would be fetched via `GET /api/scores?puzzleId=xxx`. Requires a database and API layer — not yet built. |
| 2 | **Puzzle quality filter** | `puzzles-el.json` was generated without vowel/consonant balance rules. The batch generator should enforce: ≥ 2 vowels in the 7 letters, ≥ 2 consonants, centre letter must be a vowel, ≥ 1 pangram. The current file should be deleted and regenerated once the generator is updated. |
| 3 | **English puzzle data** | `puzzles-en.json` still exists on disk (gitignored) but the English language path has been fully removed from the app (`Language = "el"` only). The file and any associated scripts referencing `--lang=en` can be cleaned up. |
| 4 | **`usePersistence` not saving `puzzleMaxScore`** | `RESTORE_STATE` merges `foundWords`, `score` and `currentRank` from localStorage but not `puzzleMaxScore`. Because `puzzleMaxScore` is recomputed in `buildInitialState` on every page load this is currently harmless — but if scoring ever changes between versions, a restored session could show a stale rank. |
| 5 | **No E2E tests** | All tests are unit (pure logic) or component-level (RTL). No Playwright/Cypress test covers a full browser session, including localStorage rehydration and the random puzzle navigation flow. |

---

## Running tests

```bash
npm run test              # single run, all files
npm run test:watch        # watch mode (re-runs on save)
```

Test files in `src/test/`:

| File | Covers |
|------|--------|
| `gameLogic.test.ts` | `isPangram`, `scoreWord`, `maxScore`, `calculateRank`, `validateWord` |
| `gameReducer.test.ts` | All 7 reducer actions (`ADD_LETTER`, `DELETE_LETTER`, `CLEAR_INPUT`, `SUBMIT_WORD`, `SHUFFLE_LETTERS`, `NEW_GAME`, `RESTORE_STATE`) |
| `greekLogic.test.ts` | Greek-specific normalisation, pangram detection, data layer |
| `GameBoard.test.tsx` | Rendering, keyboard input, word submission, button interactions |

# � Greek Word Games Platform

A multi-game browser platform for Greek (and English) word games, built with **Next.js 15 · TypeScript · Tailwind CSS · Vitest**.

## Games

| Game | Route | Status | Description |
|------|-------|--------|-------------|
| 🍯 Spelling Bee | `/spelling-bee` | Live | 7-letter honeycomb — find words containing the center letter |
| 🟩 Wordle GR | `/wordle` | Live | Guess a hidden Greek word (4–8 letters) in 6 attempts — switch length in-game |
| 🔗 Connections | `/connections` | Live | Group 16 curated words into 4 categories of 4 |

All games share a common shell (hamburger navigation menu), a unified persistence layer, and a consistent design foundation. Each game's logic, state, and data are fully isolated.

---

## Project Agent

This project is managed with a dedicated AI coding agent using **Claude Code**. Agent files live in `.agents/aiHelper/`:

| File | Purpose |
|------|---------|
| `.agents/aiHelper/soul.md` | Agent identity, beliefs, and hard constraints |
| `.agents/aiHelper/memory.md` | All architecture decisions and context across sessions |
| `.agents/aiHelper/goals.md` | Phased roadmap (Phase 1–4) with checkboxes |
| `.agents/aiHelper/log.md` | Per-session changelog |
| `.agents/aiHelper/reflections.md` | Post-session risks, tensions, and open questions |

### Claude Code workflow

`CLAUDE.md` at the project root is auto-loaded by Claude Code on every session — it contains standing rules and instructs Claude to read the `.agents/aiHelper/` files automatically.

To start a full context session, type `/aihelper` in the Claude Code chat. Claude will read all agent files and confirm it is ready before taking your task.

### Available slash commands

All commands live in `.claude/skills/`. Engineering skills are installed from [mattpocock/skills](https://github.com/mattpocock/skills) via `npx skills@latest add mattpocock/skills` — run the installer again to update them. The installer keeps real files in `.agents/skills/` and creates junctions in `.claude/skills/` pointing there; do **not** delete `.agents/skills/` or the junctions will break.

#### All slash commands (`.claude/skills/`)

| Command | Purpose |
|---------|---------|
| `/aihelper` | Full context reload — reads all `.agents/aiHelper/` files, then waits for your task |
| `/improve-codebase-architecture` | Surface architectural seams and deepening opportunities |
| `/grill-me` | Relentless Q&A to stress-test a plan or design decision |
| `/grill-with-docs` | Like `/grill-me` but cross-checks against domain docs (CONTEXT.md, ADRs) and updates them inline |
| `/to-prd` | Synthesise current context into a structured PRD |
| `/to-issues` | Break a plan or PRD into independently-grabbable vertical-slice issues on the issue tracker |
| `/triage` | Move issues through a state machine (needs-triage → ready-for-agent / ready-for-human / wontfix) |
| `/diagnose` | Disciplined debugging loop — reproduce → minimise → hypothesise → instrument → fix → regression-test |
| `/tdd` | Test-driven development with red-green-refactor vertical slices |
| `/prototype` | Build a throwaway prototype (terminal logic harness or multi-variant UI) to answer a design question |
| `/zoom-out` | Map all relevant modules and callers when unfamiliar with an area of code |
| `/handoff` | Compact the current conversation into a handoff document for the next agent session |
| `/caveman` | Ultra-compressed token-saving mode — full technical accuracy, zero filler |
| `/setup-matt-pocock-skills` | One-time setup: configure issue tracker, triage labels, and domain doc layout |
| `/write-a-skill` | Create a new skill with proper structure and bundled reference files |

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

# One-time: normalise the full words-el.json dictionary
# (strips accents, lowercases, ς→σ, deduplicates; backs up original as words-el.raw.json)
node scripts/normalize-el-dict.mjs

# Filter normalised dictionary to a target word length for Wordle
# (output: src/data/wordle/words-N.json)
node scripts/normalize-wordlist.mjs --length=5

# Generate a single puzzle manually
npm run generate-puzzle -- --lang=el --center=α --outer=π,ο,λ,ε,μ,σ --date=2026-03-26

# Batch-generate many puzzles and append to puzzles-el.json
npm run batch-generate -- --target=200 --min-words=50 --lang=el
```

---

## How the game works — step by step

> This describes the **Spelling Bee** flow. Wordle and Connections follow the same shell/persistence patterns but have their own pure-logic modules under `src/games/`.

1. **Puzzle load** (`src/app/spelling-bee/page.tsx` — server component)
   - The server reads the `?puzzle=YYYY-MM-DD` query param (or uses today's date).
   - It calls `getPuzzleForDate` from `src/data/spelling-bee/index.ts`.
   - The resolved `Puzzle` object is passed as a prop to `<GameBoard>`.

2. **State initialisation** (`src/games/spelling-bee/hooks/gameReducer.ts → buildInitialState`)
   - A clean `GameState` is built: empty input, zero score, Beginner rank.
   - `puzzleMaxScore` is computed once here (see Scoring below) and stored in state so it never needs to be recalculated.

3. **Client rehydration** (`src/games/spelling-bee/hooks/useGameState.ts`)
   - After first render, `loadPersistedState` checks `localStorage` for a saved session matching the puzzle ID.
   - If found, a `RESTORE_STATE` action merges the saved fields (found words, score, rank) back into state.

4. **Player input**
   - Hex cells (`<HoneycombGrid>`) call `addLetter` on click.
   - Physical keyboard events are handled by `handleKeyboardLetter` (normalises accented input → base letter, then filters against the puzzle's allowed set). This logic lives entirely in `useGameState` — `<GameBoard>` is a pure event dispatcher.
   - Backspace → `deleteLetter`, Enter → `submitWord`.

5. **Word submission** (`src/games/spelling-bee/hooks/gameReducer.ts → SUBMIT_WORD`)
   - `validateWord` (pure, `src/games/spelling-bee/lib/validation.ts`) runs 5 rules in order: length ≥ 4, letters in puzzle set, contains centre letter, in valid word list, not already found.
   - A puzzle index (letter sets + valid word set) is built once per puzzle ID and cached in a module-level Map — never rebuilt on subsequent submissions.
   - If valid: score is updated, rank is recalculated via `calculateRank`, word is added to `foundWords`.

6. **Scoring** (`src/games/spelling-bee/lib/scoring.ts`)
   - 4-letter word → 1 pt
   - 5+ letter word → 1 pt per letter
   - Pangram (uses all 7 letters) → above + 7 bonus pts
   - `maxScore` = sum of all word scores, hard-capped at 500 pts (`MAX_SCORE_CAP`).

7. **Rank calculation** (`src/games/spelling-bee/lib/ranking.ts`)
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

8. **Persistence** (`src/hooks/useRoundPersistence.ts`)
   - After first render, the hook hydrates from `localStorage` — if a saved session matches the current puzzle ID it dispatches `RESTORE_STATE` into the reducer.
   - On every snapshot change, `foundWords`, `score`, `currentRank`, `startedAt`, and `givenUp` are written to the `wordgames:state` envelope under the game's slice (via `useGameStore`).
   - State is tied to the session key (puzzle ID) — switching puzzles starts a fresh session automatically.

9. **UI composition** (`src/components/spelling-bee/GameBoard.tsx`)
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
  app/              Next.js App Router — shell layout, game picker, per-game routes
    spelling-bee/   Daily puzzle + custom /[center]/[outer] dynamic route
    wordle/         4–8 letter Greek Wordle (multi-length)
    connections/    Group 16 words into 4 categories
  components/
    shared/         Cross-game UI primitives (Shell, FeedbackBanner, HowToPlayModal, LetterPickerModal)
    spelling-bee/   Spelling Bee-specific components (GameBoard, HoneycombGrid, ShareButton, …)
    wordle/         Wordle-specific components (WordleBoard, GuessGrid, Tile, Keyboard)
    connections/    Connections-specific components (GroupGrid, WordCard, CategoryReveal)
  games/            Pure logic — one folder per game, zero React imports
    spelling-bee/
      lib/          validation, scoring, ranking, pangram, normalize, computeValidWords, parseCustomUrl
      hooks/        useGameState, gameReducer
      types.ts
    wordle/
      lib/          evaluateGuess, isValidGuess, letterState, scoring
      hooks/        useWordleState, wordleReducer
      types.ts
    connections/
      hooks/        useConnectionsState, connectionsReducer
      types.ts
  hooks/
    useGameStore.ts        Unified localStorage envelope — the only code that touches localStorage
    useRoundPersistence.ts Generic session persistence hook used by all three games (hydrate/save/clear)
  data/
    spelling-bee/   puzzles-el.json (1008 daily puzzles), index.ts
    wordle/         words-4..8.json (per-length word lists from full dict), index.ts
    connections/    puzzles-connections.json (hand-curated), index.ts
    words-el.json   811k normalised Greek words (no accents, ς→σ)
  lib/
    greeklish.ts    Bijective Greek↔greeklish codec for clean ASCII custom URLs
  types/            Shared types: Language, GameId, PersistenceEnvelope
scripts/            Puzzle generation & curation CLIs (batch-generate, curate-answers, …)
```

**Key design principles:**
- Game logic (`src/games/*/lib/`) is pure functions with no React dependency — testable with plain Vitest, no DOM required
- Each game reads/writes only its own slice of `localStorage` via `useGameStore` — cross-game leakage is structurally impossible
- A component graduates to `shared/` only when two games genuinely need it — no speculative extraction
- No magic hex values or inline styles — a future visual rebrand requires only a Tailwind theme config change

---

## High scores / leaderboard

**Spelling Bee** — live. Rolling 7-day leaderboard via Supabase (`scores` table). Score = Spelling Bee points, higher = better.

**Wordle GR** — live. Rolling 7-day daily leaderboard via Supabase (`wordle_scores` table). Score = sum of attempts across all 5 lengths (4–8) for a given day; lower = better. Missing lengths count as 7 (penalty). Players appear on the board as soon as they finish at least one length.

---

## Tech debt

Tracked as individual issues in [`.claude/issue-tracker/issues/`](.claude/issue-tracker/issues/). Each file has a `Status:` line using the project triage vocabulary (`needs-triage`, `ready-for-agent`, `ready-for-human`).

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
| `gameReducer.test.ts` | All 7 Spelling Bee reducer actions |
| `greekLogic.test.ts` | Greek-specific normalisation, pangram detection, data layer |
| `GameBoard.test.tsx` | Rendering, keyboard input, word submission, button interactions |
| `useGameStore.test.ts` | `readSlice`, `writeSlice`, `clearSlice`, migration from legacy key |
| `Shell.test.tsx` | Hamburger open/close, navigation links, keyboard dismiss |
| `persistence.test.ts` | `useRoundPersistence` — hydration, saving, `clear()`, session isolation, `shouldSave` guard |
| `evaluateGuess.test.ts` | Two-pass algorithm — exact, present, absent, duplicate-letter edge cases |
| `wordleReducer.test.ts` | `ADD_LETTER`, `DELETE_LETTER`, `SUBMIT_GUESS` (win/loss/invalid), `RESTORE_STATE` |
| `wordleLogic.test.ts` | `scoreWordle`, `buildLetterStateMap` priority rules |

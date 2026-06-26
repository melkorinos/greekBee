# � Greek Word Games Platform

A multi-game browser platform for Greek (and English) word games, built with **Next.js 16 · TypeScript · Tailwind CSS · Vitest**.

## Games

| Game | Route | Status | Description |
|------|-------|--------|-------------|
| 🌸 Leksokipos | `/leksokipos` | Live | 7-letter flower grid — find words containing the center letter |
| 🟩 Leksiarxeio | `/leksiarxeio` | Live | Guess a hidden Greek word (4–8 letters) in 6 attempts — switch length in-game |
| 🔗 Leksindeseis | `/leksindeseis` | Live | Group 16 curated words into 4 categories of 4 |
| 💬 Vres Tin Frasi | `/vres-tin-frasi` | Live | Guess the daily Greek phrase (3–4 words) tile-by-tile |
| ✏️ Stavrolekso | `/stavrolekso` | Live | Browse & solve community-submitted Greek crosswords |
| ⚖️ Leksikastirio | `/leksikastirio` | Live | Community word court — vote on words to add or remove from the dictionary |

All games share a common shell (hamburger navigation menu), a unified persistence layer, and a consistent design foundation. Each game's logic, state, and data are fully isolated.

---

## Special pages (developer / admin access)

### Leksikastirio — public voting

`/leksikastirio`

All players can visit this page to see pending nominations (words proposed for addition or removal) and vote for or against them.

### Leksikastirio — admin review

`/leksikastirio?admin=YOUR_ADMIN_SECRET`

Appending `?admin=<secret>` enables admin mode. Each nomination card shows **Έγκριση** (Approve) and **Απόρριψη** (Reject) buttons. The secret is validated server-side against the `ADMIN_SECRET` environment variable — the UI only reveals the buttons when the param is non-empty, but any API call with a wrong secret returns 403.

To apply approved nominations to the live word list, run the CLI script:

```bash
# Dry-run (no changes)
node scripts/apply-nominations.mjs --dry-run

# Apply accepted nominations to src/data/words-el.json
node scripts/apply-nominations.mjs
```

The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`.

---

## Project Agent

This project is managed with a dedicated AI coding agent using **Claude Code**. Agent files live in `.claude/aiHelper/`:

| File | Purpose |
|------|---------|
| `.claude/aiHelper/soul.md` | Agent identity, beliefs, and hard constraints |
| `.claude/aiHelper/memory.md` | All architecture decisions and context across sessions |
| `.claude/aiHelper/goals.md` | Phased roadmap (Phase 1–4) with checkboxes |
| `.claude/aiHelper/log.md` | Per-session changelog |
| `.claude/aiHelper/reflections.md` | Post-session risks, tensions, and open questions |

### Claude Code workflow

`CLAUDE.md` at the project root is auto-loaded by Claude Code on every session — it contains standing rules and instructs Claude to read the `.claude/aiHelper/` files automatically.

To start a full context session, type `/aihelper` in the Claude Code chat. Claude will read all agent files and confirm it is ready before taking your task.

### Available slash commands

All commands live in `.claude/skills/`.

#### All slash commands (`.claude/skills/`)

| Command | Purpose |
|---------|---------|
| `/aihelper` | Full context reload — reads all `.claude/aiHelper/` files, then waits for your task |
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

# Filter normalised dictionary to a target word length for Leksiarxeio
# (output: src/data/leksiarxeio/words-N.json)
node scripts/normalize-wordlist.mjs --length=5

# Generate a single puzzle manually
npm run generate-puzzle -- --lang=el --center=α --outer=π,ο,λ,ε,μ,σ --date=2026-03-26

# Batch-generate many puzzles and append to puzzles-el.json
npm run batch-generate -- --target=200 --min-words=50 --lang=el
```

---

## How the game works — step by step

> This describes the **Leksokipos** flow. Leksiarxeio and Leksindeseis follow the same shell/persistence patterns but have their own pure-logic modules under `src/games/`.

1. **Puzzle load** (`src/app/leksokipos/page.tsx` — server component)
   - The server reads the `?puzzle=YYYY-MM-DD` query param (or uses today's date).
   - It calls `getPuzzleForDate` from `src/data/leksokipos/index.ts`.
   - The resolved `Puzzle` object is passed as a prop to `<GameBoard>`.

2. **State initialisation** (`src/games/leksokipos/hooks/gameReducer.ts → buildInitialState`)
   - A clean `GameState` is built: empty input, zero score, Σπόρος rank.
   - `puzzleMaxScore` is computed once here (see Scoring below) and stored in state so it never needs to be recalculated.

3. **Client rehydration** (`src/games/leksokipos/hooks/useGameState.ts`)
   - After first render, `loadPersistedState` checks `localStorage` for a saved session matching the puzzle ID.
   - If found, a `RESTORE_STATE` action merges the saved fields (found words, score, rank) back into state.

4. **Player input**
   - Flower cells (`<FlowerGrid>`) call `addLetter` on click.
   - Physical keyboard events are handled by `handleKeyboardLetter` (normalises accented input → base letter, then filters against the puzzle's allowed set). This logic lives entirely in `useGameState` — `<GameBoard>` is a pure event dispatcher.
   - Backspace → `deleteLetter`, Enter → `submitWord`.

5. **Word submission** (`src/games/leksokipos/hooks/gameReducer.ts → SUBMIT_WORD`)
   - `validateWord` (pure, `src/games/leksokipos/lib/validation.ts`) runs 5 rules in order: length ≥ 4, letters in puzzle set, contains centre letter, in valid word list, not already found.
   - A puzzle index (letter sets + valid word set) is built once per puzzle ID and cached in a module-level Map — never rebuilt on subsequent submissions.
   - If valid: score is updated, rank is recalculated via `calculateRank`, word is added to `foundWords`.

6. **Scoring** (`src/games/leksokipos/lib/scoring.ts`)
   - 4-letter word → 1 pt
   - 5+ letter word → 1 pt per letter
   - Pangram (uses all 7 letters) → above + 7 bonus pts
   - `maxScore` = sum of all word scores, hard-capped at 500 pts (`MAX_SCORE_CAP`).

7. **Rank calculation** (`src/games/leksokipos/lib/ranking.ts`)
   - Score is compared against thresholds as a % of `maxScore`:

   | Rank        | Threshold |
   |-------------|-----------|
   | Σπόρος      | 0%        |
   | Βλαστός     | 6%        |
   | Μπουμπούκι  | 12%       |
   | Άνοιγμα     | 20%       |
   | Ανθισμένο   | 30%       |
   | Θαυμαστό    | 42%       |
   | Ευφυΐα      | 55%       |
   | Άνθος       | 80%       |

   `rankProgress()` (pure function) derives the progress-bar fill, points-to-next and the full ladder for the UI — keeping all rank display logic out of React components.

8. **Persistence** (`src/hooks/useRoundPersistence.ts`)
   - After first render, the hook hydrates from `localStorage` — if a saved session matches the current puzzle ID it dispatches `RESTORE_STATE` into the reducer.
   - On every snapshot change, `foundWords`, `score`, `currentRank`, `startedAt`, and `givenUp` are written to the `wordgames:state` envelope under the game's slice (via `useGameStore`).
   - State is tied to the session key (puzzle ID) — switching puzzles starts a fresh session automatically.

9. **UI composition** (`src/components/leksokipos/GameBoard.tsx`)
   - `<ScoreBar>` — rank label, progress bar, rank ladder popover, leaderboard button (daily only).
   - `<WordInput>` — live letter display, centre letter highlighted in yellow.
   - `<FeedbackMessage>` — toast after each submission.
   - `<FlowerGrid>` — SVG letter grid with two visual variants: **Pie Slice** (annular sectors) and **Flower** (elliptical petals). Configured via `FlowerGridConfig`. The player's variant preference is toggled from the page header and stored in `localStorage`.
   - `<FoundWordsList>` — sorted found words, pangrams highlighted.
   - `<HowToPlayModal>` — rules modal (? button, Greek only).

---

## Architecture

```
src/
  app/              Next.js App Router — shell layout, game picker, per-game routes
    leksokipos/     Daily puzzle + custom /[center]/[outer] dynamic route (server component delegates to LeksokiposLayout)
    leksiarxeio/    4–8 letter Greek word game (multi-length)
    leksindeseis/   Group 16 words into 4 categories
    vres-tin-frasi/ Daily Greek phrase guessing game
    stavrolekso/    Community crossword browser + maker (/[id], /maker)
    leksikastirio/  Community word-court (public voting + admin review)
    api/            Edge routes: game-scores, game-state, profile, transfer, nominations, community-puzzles, auth
  components/
    shared/         Cross-game UI primitives (Shell, FeedbackBanner, HowToPlayModal, LetterPickerModal)
    leksokipos/     Leksokipos components (LeksokiposLayout, GameBoard, FlowerGrid, FlowerGridPlayground, ScoreBar, LeaderboardModal, …)
    leksiarxeio/    Leksiarxeio components (LeksiarxeioBoard, GuessGrid, Tile, Keyboard)
    leksindeseis/   Leksindeseis components (GroupGrid, WordCard, CategoryReveal, ConnectionsBoard, ConnectionsLeaderboardModal)
    vrestifrasi/    Vres Tin Frasi components (board, phrase tiles, leaderboard modal)
    leksikastirio/  Community word-court admin / voting UI
  games/            Pure logic — one folder per game, zero React imports
    leksokipos/
      lib/          validation, scoring, ranking, pangram, normalize, computeValidWords, parseCustomUrl
      hooks/        useGameState, gameReducer
      types.ts
    leksiarxeio/
      lib/          evaluateGuess, isValidGuess, letterState, scoring
      hooks/        useLeksiarxeioState, leksiarxeioReducer
      types.ts
    leksindeseis/
      lib/          matching
      hooks/        useLeksindeseisState, leksindeseisReducer
      types.ts
    vrestifrasi/
      lib/          evaluatePhraseGuess, letterState, scoring
      hooks/        useVresTinFrasiState, vresTinFrasiReducer
      types.ts
    stavrolekso/
      lib/          autoNumberSlots, getSlotLength, isConnected, normalizeAndCompare
      types.ts   (also holds StavroleksoGrid.tsx — a React component, unlike the other games' pure-logic folders)
  hooks/
    useGameStore.ts        Unified localStorage envelope — the only code that touches localStorage
    useGameIdentity.ts     SSR-safe DeviceId + DisplayName init; used by all three game boards
    useScoreSubmission.ts  Unified score-posting for all three games (submit / submitWithName / submitLength)
    useRoundPersistence.ts Generic session persistence hook used by all three games (hydrate/save/clear)
    useGameStateSync.ts    Cross-device sync hook — pushes Leksokipos state on valid word submit
  data/
    leksokipos/     puzzles-el.json (daily puzzles), index.ts
    leksiarxeio/    words-2..8.json (per-length word lists from full dict), index.ts
    leksindeseis/   puzzles-connections.json (hand-curated), index.ts
    vrestifrasi/    phrases-el.json (static phrase fallback), index.ts
    words-el.json   ~795k normalised Greek words (no accents, ς→σ)
  lib/
    greeklish.ts    Bijective Greek↔greeklish codec for clean ASCII custom URLs
    postScore.ts    Fire-and-forget POST utility — silently swallows network errors
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

**Leksokipos** — live. Rolling 7-day leaderboard via Supabase (`game_scores` table with `game_id = "leksokipos"`). Score = Leksokipos points, higher = better.

**Leksiarxeio** — live. Rolling 7-day daily leaderboard via Supabase (`game_scores` with `game_id = "leksiarxeio"`, per-length rows via `word_length`). Score = sum of in-game points across all 5 lengths (4–8) for a given day (6 pts for a 1st-guess solve … 1 pt at the 6th); higher = better. Failed/unplayed length = 0. Players appear on the board as soon as they finish at least one length.

**Leksindeseis** — live. Per-puzzle leaderboard via Supabase (`game_scores` with `game_id = "leksindeseis"`). Score = mistakes remaining (1–4) when won; higher = better. Lost games do not appear on the board.

**Vres Tin Frasi** — live. Per-day leaderboard via Supabase (`game_scores` with `game_id = "vrestifrasi"`). Score = attempts used (1–6); lower = better; failed = 7 (penalty).

---

## Tech debt

Tracked as individual issues in [`.claude/issue-tracker/issues/`](.claude/issue-tracker/issues/). Each file has a `Status:` line using the project triage vocabulary (`needs-triage`, `ready-for-agent`, `ready-for-human`).

| # | Issue | Status |
|---|-------|--------|
| 01 | [No E2E tests](.claude/issue-tracker/issues/01-no-e2e-tests.md) | needs-triage |
| 02 | [Mobile keyboard gap](.claude/issue-tracker/issues/02-mobile-keyboard-gap.md) | needs-triage |
| 03 | [Style token cleanup](.claude/issue-tracker/issues/03-td001-style-tokens.md) | needs-triage |
| 04 | [Max score cap](.claude/issue-tracker/issues/04-td002-max-score-cap.md) | needs-triage |
| 05 | [Leksiarxeio answer pool quality](.claude/issue-tracker/issues/05-td003-wordle-answer-pool.md) | needs-triage |
| 06 | [Supabase / Vercel storage](.claude/issue-tracker/issues/06-td004-supabase-vercel-storage.md) | needs-triage |
| 07 | [Strip validWords from puzzles-el.json](.claude/issue-tracker/issues/07-puzzles-json-file-size.md) | needs-triage |
| 08 | [Scheduled stale-row cleanup](.claude/issue-tracker/issues/08-scheduled-stale-row-cleanup.md) | ready-for-agent |
| 09 | [API rate limiting per device](.claude/issue-tracker/issues/09-api-rate-limiting.md) | ready-for-human |
| 10 | [Word suggestion review pipeline](.claude/issue-tracker/issues/10-word-suggestion-review-pipeline.md) | ready-for-agent |

---

## Running tests

```bash
npm run test              # single run, all files
npm run test:watch        # watch mode (re-runs on save)
```

Test files are organised under `src/test/` by game and shared utilities:

**Leksokipos (`src/test/leksokipos/`)**

| File | Covers |
|------|--------|
| `gameLogic.test.ts` | `isPangram`, `scoreWord`, `maxScore`, `calculateRank`, `validateWord` |
| `gameReducer.test.ts` | All reducer actions: `ADD_LETTER`, `DELETE_LETTER`, `SUBMIT_WORD`, `RESTORE_STATE`, etc. |
| `greekLogic.test.ts` | Greek-specific normalisation, pangram detection, data layer |
| `GameBoard.test.tsx` | Rendering, keyboard input, word submission, give-up flow, leaderboard button placement |
| `computeValidWords.test.ts` | `computeValidWords` — valid word filtering, pangram detection |
| `puzzle.test.ts` | `getPuzzleForDate`, `getPuzzleById`, fallback and edge-date handling |
| `leksokiposDataLoader.test.ts` | Server-side data loading and URL param resolution |
| `leksokiposRouting.test.ts` | Custom URL routing — greeklish encode/decode round-trip |
| `customPuzzle.test.tsx` | Custom puzzle UI flow end-to-end |
| `suggestions.test.ts` | Word suggestion localStorage helpers |
| `suggestWordModal.test.tsx` | Suggest-word modal interaction |
| `wordInput.test.tsx` | WordInput rendering and letter highlighting |
| `missedWordsList.test.tsx` | MissedWordsList — give-up reveal, pangram highlights |

**Leksiarxeio (`src/test/leksiarxeio/`)**

| File | Covers |
|------|--------|
| `evaluateGuess.test.ts` | Two-pass algorithm — exact, present, absent, duplicate-letter edge cases |
| `leksiarxeioReducer.test.ts` | `ADD_LETTER`, `DELETE_LETTER`, `SUBMIT_GUESS` (win/loss/invalid), `RESTORE_STATE` |
| `gameLogic.test.ts` | `scoreLeksiarxeio`, `buildLetterStateMap` priority rules |
| `guessGrid.test.tsx` | GuessGrid tile rendering and colour states |
| `header.test.tsx` | Header length-picker and stats display |
| `theme.test.tsx` | Dark theme token propagation |
| `dataLoader.test.ts` | Word-list loading and length validation |

**Leksindeseis (`src/test/leksindeseis/`)**

| File | Covers |
|------|--------|
| `leksindeseisReducer.test.ts` | Leksindeseis reducer — guesses, solves, one-away detection |
| `groupGrid.test.tsx` | GroupGrid rendering and animation states |
| `dataLoader.test.ts` | Puzzle loading and date resolution |

**Shared (`src/test/shared/` and `src/test/`)**

| File | Covers |
|------|--------|
| `useGameStore.test.ts` | `readSlice`, `writeSlice`, `clearSlice`; `deviceId`, `displayName`, `profileLinked`, `disconnectProfile` helpers |
| `useGameIdentity.test.ts` | SSR-safe DeviceId + DisplayName init — initial values from store, setter stability |
| `persistence.test.ts` | `useRoundPersistence` — hydration, saving, `clear()`, session isolation, `shouldSave` guard |
| `Shell.test.tsx` | Hamburger open/close, navigation links, keyboard dismiss |
| `leaderboardModal.test.tsx` | Day strip, play link, display-name editor, profile create/restore/linked/disconnect flows |
| `feedbackMessage.test.tsx` | FeedbackMessage variants — accepted, errors, pangram, suggest button |
| `greeklish.test.ts` | Bijective Greek↔greeklish codec round-trip |
| `normalize.test.ts` | Accent stripping, ς→σ normalisation, deduplication |
| `parseCustomUrl.test.ts` | Custom URL segment parsing |
| `useLeaderboard.test.ts` | Leaderboard fetch hook — loading, error, refresh |
| `useScoreSubmission.test.ts` | Unified score submission — `submit` + `submitWithName` (Leksokipos/Leksindeseis), `submitLength` with won/lost penalty (Leksiarxeio) |
| `supabase.test.ts` | Supabase client initialisation guard |
| `gameScoresRoute.test.ts` | `/api/game-scores` edge route |
| `performance.test.ts` | Validation and scoring hot-path benchmarks |
| `deploymentReadiness.test.ts` | Environment variable presence checks |
| `leksokiposStyles.test.ts` | Leksokipos Tailwind class constants |
| `noAccents.test.ts` | Accent-free word list integrity |
| `letterPickerModal.test.tsx` | LetterPickerModal rendering and selection |
| `mobileLayout.test.tsx` | Mobile viewport layout smoke test |

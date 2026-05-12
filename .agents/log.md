# Agent Log — Greek Word Games Platform

> Entries newest-first. Full file list kept only for the most recent session.

---

## 2026-05-12 — Session 5: Phase 3 — Connections ✅

**Outcome:** Connections live end-to-end. 167/167 tests. Build clean.

- `src/games/connections/types.ts` — `ConnectionsPuzzle`, `ConnectionGroup`, `ConnectionsState`, `ConnectionsPersistedState`, `ConnectionsAction` (no `language` field — locked ADR)
- `src/data/connections/puzzles-connections.json` — seed puzzle 2026-05-12
- `src/data/connections/index.ts` — `getTodaysConnectionsPuzzle(date)`, fallback to last in array
- `src/games/connections/hooks/connectionsReducer.ts` — pure reducer (SELECT_WORD, SUBMIT_GUESS, SHUFFLE, CLEAR_FEEDBACK); 4-mistake limit; one-away detection
- `src/games/connections/hooks/useConnectionsState.ts` — React hook; persistence via `writeSlice("connections")`
- `src/components/shared/FeedbackBanner.tsx` — **graduated** shared primitive; `theme` prop (`light`/`dark`); used by Wordle + Connections
- `src/components/connections/` — `WordCard`, `GroupGrid`, `CategoryReveal`, `index.ts`
- `src/app/connections/ConnectionsBoard.tsx` — client board (state + layout + mistake dots)
- `src/app/connections/page.tsx` — server page; replaced stub
- `src/components/wordle/WordleBoard.tsx` — replaced inline banner with `<FeedbackBanner theme="dark" />`
- `src/app/page.tsx` — Connections card `available: true`
- `scripts/validate-connections.mjs` — validates 4 groups × 4 words, no duplicates, unique dates
- `src/test/connectionsReducer.test.ts` — 14 unit tests
- `src/test/connectionsGroupGrid.test.tsx` — 5 RTL smoke tests

---

## 2026-05-12 — Session 4: Phase 2.5 — Theming ✅

**Outcome:** All `dark:` Tailwind classes removed from Wordle. Theme seam lives solely at `<main>` root of `/wordle/page.tsx`. Shell + Spelling Bee confirmed clean. 151/151 tests.

- `src/app/wordle/page.tsx` — `bg-zinc-900 text-stone-100` on `<main>`
- `src/components/wordle/Keyboard.tsx` — `unknown` → `bg-stone-700 text-stone-100 border-stone-600`
- `src/components/wordle/Tile.tsx` — `empty/pending` → unconditional `border-stone-600/500 text-stone-100`
- `src/components/wordle/WordleBoard.tsx` — banners → `bg-green-900/red-900/stone-700`
- `src/test/Shell.test.tsx` — added `bg-white` header assertion
- `src/test/wordleTheme.test.tsx` — new; smoke-tests Tile + Keyboard dark classes

---

## 2026-05-12 — Session 3: Phase 2 — Wordle GR ✅

**Outcome:** Wordle GR (5-letter) live. 143/143 tests. Build clean.

Key decisions:
- `evaluateGuess` — two-pass (exact first, then frequency-map for present); handles duplicates correctly
- `getTodaysWordlePuzzle` — deterministic (epoch-day mod list length); date passed as server prop
- Dictionary: `words-el.raw.json` (826k, immutable) → `words-el.json` (811k, pre-normalised, committed); `words-5.json` gitignored (generated)
- Answer pool: `answers-5.json` (~3.8k curated words) for daily answer; `words-5.json` for guess validation
- Persistence: `wordgames:state` envelope, slice key `wordle` → nested `{ "5": WordlePersistedSession }`

Files: `src/games/wordle/types.ts`, `lib/{evaluateGuess,scoring,letterState,index}.ts`, `hooks/{wordleReducer,useWordleState,index}.ts`, `src/data/wordle/index.ts`, `src/components/wordle/{Tile,GuessGrid,Keyboard,WordleBoard,index}.ts`

Tests: `evaluateGuess.test.ts` (7), `wordleReducer.test.ts` (11), `wordleLogic.test.ts` (9), `wordleDataLoader.test.ts` (14) = 41 new tests

---

## 2026-05-12 — Session 2: Phase 1 — Foundation ✅

**Outcome:** Mono-game → multi-game structure. Shell + routing. Unified persistence. 72/72 tests.

Key moves:
- All Spelling Bee code → `src/games/spelling-bee/{lib,hooks,types.ts}`
- `src/data/puzzles-el.json` → `src/data/spelling-bee/puzzles-el.json`
- All components → `src/components/spelling-bee/`
- `src/types/index.ts` stripped to `Language`, `GameId`, `PersistenceEnvelope`
- `src/components/shared/Shell.tsx` — sticky header, hamburger drawer, Escape + backdrop dismiss
- `src/hooks/useGameStore.ts` — `readSlice<T>`, `writeSlice<T>`, `clearSlice`, `migrateFromLegacyKeys`
- `src/hooks/usePersistence.ts` — delegates to `useGameStore`; zero direct `localStorage` calls
- `src/app/page.tsx` → game picker; `/spelling-bee`, `/wordle`, `/connections` routes created

---

## 2026-05-12 — Session 1: Architecture Planning ✅

- 7-question architecture interview; multi-game platform PRD produced
- Created `.agents/` files; updated README


### Step A — Folder Restructure ✅
- Created `src/games/spelling-bee/lib/` — all 6 lib files moved with import paths updated to `../types` and relative siblings
- Created `src/games/spelling-bee/hooks/` — `gameReducer.ts` and `useGameState.ts` moved; `useGameState` now imports `usePersistence` from `@/hooks/usePersistence` (not relative, since it stays in `src/hooks/`)
- Created `src/games/spelling-bee/types.ts` — all Spelling Bee-specific types; `Puzzle` imports `Language` from `@/types`
- Updated `src/types/index.ts` — stripped to `Language`, `GameId`, `PersistenceEnvelope` only
- Moved `src/data/puzzles-el.json` → `src/data/spelling-bee/puzzles-el.json`
- Created `src/data/spelling-bee/index.ts` — new scoped data loader
- Updated `src/data/index.ts` — thin barrel re-exporting from `./spelling-bee/index`
- Moved all 9 components to `src/components/spelling-bee/`; updated their imports
- Deleted all old `src/lib/`, `src/hooks/gameReducer.ts`, `src/hooks/useGameState.ts`, and old root components
- Fixed `btn-enter` testid (was accidentally changed to `btn-submit`) — caught by tests
- Fixed `src/data/index.ts` duplicate export (stale function bodies left by partial edit) — caught by build

### Step B — Shell + Routing ✅
- Created `src/components/shared/Shell.tsx` — sticky header + hamburger drawer listing all 3 games; uses stone/neutral palette; closes on Escape and backdrop click
- Updated `src/app/layout.tsx` — wraps children in `<Shell>`; updated metadata title to "Greek Word Games"
- Created `src/app/spelling-bee/page.tsx` — Spelling Bee puzzle loader (moved from `src/app/page.tsx`)
- Replaced `src/app/page.tsx` — minimal game picker with 3 cards; Wordle and Connections show "Σύντομα" badge
- Created `src/app/wordle/page.tsx` and `src/app/connections/page.tsx` — stubs

### Step C — Unified Persistence ✅
- Created `src/hooks/useGameStore.ts` — single `wordgames:state` localStorage key; `readSlice<T>`, `writeSlice<T>`, `clearSlice`, `migrateFromLegacyKeys`
- Updated `src/hooks/usePersistence.ts` — delegates all localStorage access to `useGameStore`; no direct `localStorage` calls remain; runs `migrateFromLegacyKeys()` on first `loadPersistedState` call

### Files created this session
- `src/games/spelling-bee/types.ts`
- `src/games/spelling-bee/lib/` (6 files)
- `src/games/spelling-bee/hooks/` (2 files)
- `src/data/spelling-bee/index.ts`
- `src/components/spelling-bee/` (9 files)
- `src/components/shared/Shell.tsx`
- `src/hooks/useGameStore.ts`
- `src/app/spelling-bee/page.tsx`
- `src/app/wordle/page.tsx`
- `src/app/connections/page.tsx`

### Files modified this session
- `src/types/index.ts` — stripped to platform types
- `src/data/index.ts` — thin barrel re-export
- `src/hooks/usePersistence.ts` — delegates to useGameStore
- `src/hooks/index.ts` — removed old game hook re-exports
- `src/app/page.tsx` — replaced with game picker
- `src/app/layout.tsx` — Shell + updated metadata
- `src/test/*.ts` — updated import paths

### Files deleted this session
- `src/lib/` (entire directory)
- `src/hooks/gameReducer.ts`, `src/hooks/useGameState.ts`
- `src/components/GameBoard.tsx`, `FeedbackMessage.tsx`, `FoundWordsList.tsx`, `HoneycombGrid.tsx`, `HowToPlayModal.tsx`, `NewPuzzleButton.tsx`, `ScoreBar.tsx`, `WordInput.tsx`, `index.ts`

### Definition of done — verified ✅
- [x] `npm run test` — 72/72 pass
- [x] `npm run build` — no type errors, all 5 routes compile

---

## 2026-05-12 — Session 4: Phase 2.5 — Theming (Step B)

### What happened
Architecture analysis using `/improve-codebase-architecture` skill surfaced one structural finding: Wordle components used `dark:` Tailwind classes (system-preference seam) instead of unconditional dark-theme classes — contradicting the locked ADR that theming is explicit per-route. These classes were unreachable dead code (no ancestor ever sets `.dark`) and posed a future bleed risk. Replaced all `dark:` classes with unconditionals; dark context is now encoded solely at the `<main>` root of `/wordle/page.tsx`.

### Files changed (Step B)
- `src/app/wordle/page.tsx` — `<main>` gains `bg-zinc-900 text-stone-100`; `h1` → `text-stone-100`; subtitle → `text-stone-400` (unconditional)
- `src/components/wordle/Keyboard.tsx` — `unknown` key state and `actionClass` use unconditional `bg-stone-700 / text-stone-100 / border-stone-600/500`
- `src/components/wordle/Tile.tsx` — `empty` and `pending` states use unconditional `border-stone-600 / text-stone-100`
- `src/components/wordle/WordleBoard.tsx` — feedback banner uses `bg-green-900/red-900/stone-700` and `text-green-100/red-100/stone-100` unconditionally

### Architecture candidates not implemented
- **FeedbackBanner shared component** — deferred; only one game needs it (standing constraint: no speculative graduation to `shared/`)
- **GameBoard.tsx button contrast** — design hygiene, no structural change needed

### Step F — Tests ✅
- Updated `src/test/Shell.test.tsx` — added assertion that `<header>` has `bg-white` class
- Created `src/test/wordleTheme.test.tsx` — smoke tests rendering `<Tile>` and `<Keyboard>` in isolation; asserts `border-stone-600`, `text-stone-100`, `bg-stone-700` unconditional dark classes
- 151/151 tests passing

### Definition of done — verified ✅
- [x] `npm run test` — 151/151 pass
- [x] `npm run build` — clean
- [x] No `dark:` classes remain in any Wordle component
- [x] Shell, Spelling Bee, and game picker files confirmed clean (no dark: classes, no changes needed)

---

## 2026-05-12 — Session 5: Phase 3 — Connections

### What happened
Built the full Connections game from scratch, graduated FeedbackBanner to shared/, enabled home page card.

### Files created
- `src/games/connections/types.ts` — `ConnectionsPuzzle`, `ConnectionGroup`, `ConnectionsState`, `ConnectionsPersistedState`, `ConnectionsAction`
- `src/data/connections/puzzles-connections.json` — seed puzzle (2026-05-12)
- `src/data/connections/index.ts` — `getTodaysConnectionsPuzzle(date)` with last-puzzle fallback
- `src/games/connections/hooks/connectionsReducer.ts` — pure reducer (SELECT_WORD, SUBMIT_GUESS, SHUFFLE, CLEAR_FEEDBACK)
- `src/games/connections/hooks/useConnectionsState.ts` — React hook; persistence via writeSlice("connections")
- `src/components/shared/FeedbackBanner.tsx` — graduated shared primitive; light + dark theme variants
- `src/components/connections/WordCard.tsx`, `GroupGrid.tsx`, `CategoryReveal.tsx`, `index.ts`
- `src/app/connections/ConnectionsBoard.tsx` — client board component
- `scripts/validate-connections.mjs` — validator: 4 groups × 4 words, no duplicates, valid dates
- `src/test/connectionsReducer.test.ts` — 14 unit tests
- `src/test/connectionsGroupGrid.test.tsx` — 5 RTL smoke tests

### Files modified
- `src/app/connections/page.tsx` — replaced stub with real server page
- `src/components/wordle/WordleBoard.tsx` — replaced inline banner with `<FeedbackBanner theme="dark" />`
- `src/app/page.tsx` — Connections card `available: true`

### Architecture decisions (locked)
- `ConnectionsPuzzle` has no `language` field
- Persistence: `writeSlice("connections")` only — no direct localStorage
- `FeedbackBanner` graduated because two games now use it (constraint satisfied)
- Daily puzzle: match by date string; fallback to last in array
- 4 mistakes max (NYT rules)

### Definition of done — verified ✅
- [x] `npm run test` — 167/167 pass
- [x] `npm run build` — clean (all 6 routes)
- [x] `node scripts/validate-connections.mjs` — seed puzzle valid

---

## 2026-05-12 — Session 3: Phase 2 — Wordle GR + Dictionary Normalisation

### What happened
Built Wordle GR (5-letter) end-to-end in one session. All 129 tests pass, build clean.

### Word list preparation
- Created `scripts/normalize-wordlist.mjs` — reads `words-el.json`, filters to target length, writes `src/data/wordle/words-N.json`
- Generated `src/data/wordle/words-5.json` — 9,568 unique 5-letter lowercase accent-free words
- Created `scripts/normalize-el-dict.mjs` — one-time script that normalises the full dictionary
- Ran normalization: 826,268 raw words → 811,614 unique normalised words in new `words-el.json`
- Original backed up as `words-el.raw.json` (never modified)
- `normalize-wordlist.mjs` updated to skip normalize step (source is already clean)

### Types — `src/games/wordle/types.ts`
- `WordlePuzzle`, `WordleLength`, `TileState`, `GuessResult`, `WordleStatus`, `WordleState`, `LetterState`, `LetterStateMap`, `WORDLE_SCORES`, `WordlePersistedSession`, `WordlePersistedSlice`

### Pure logic — `src/games/wordle/lib/`
- `evaluateGuess.ts` — two-pass algorithm (exact matches first, then present using frequency map; handles duplicates correctly)
- `scoring.ts` — `scoreWordle(guessCount, won)`: 1→6pts … 6→1pt, loss→0
- `letterState.ts` — `buildLetterStateMap` aggregates best known letter state for keyboard colouring
- `index.ts` barrel

### Hooks — `src/games/wordle/hooks/`
- `wordleReducer.ts` — pure reducer: `ADD_LETTER`, `DELETE_LETTER`, `SUBMIT_GUESS`, `NEW_GAME`, `RESTORE_STATE`, `CLEAR_MESSAGE`; `makeInitialWordleState` factory
- `useWordleState.ts` — React hook: wires reducer + persistence, derives `letterStates` + `score`
- `index.ts` barrel

### Data loader — `src/data/wordle/index.ts`
- `getTodaysWordlePuzzle(date, length)` — deterministic daily answer (epoch-day offset mod list length)
- `getValidWords(length)` — returns full word list for guess validation
- `getTodayDateString()` — ISO date from server clock

### Components — `src/components/wordle/`
- `Tile.tsx` — single letter cell with TileState-driven colour classes
- `GuessGrid.tsx` — 6×5 grid: submitted rows + live input row + empty rows
- `Keyboard.tsx` — Greek soft keyboard with letter-state colouring; `btn-enter` and `btn-delete` testids
- `WordleBoard.tsx` — assembles grid + keyboard + feedback; handles physical keyboard events; auto-clears transient messages
- `index.ts` barrel

### Route — `src/app/wordle/page.tsx`
- Server component: loads today's puzzle and valid word list, renders `<WordleBoard>`
- Marked `force-dynamic` for fresh date per request

### CSS — `src/app/globals.css`
- Added `@keyframes flip` + `.animate-flip` for tile reveal animation

### Home page — `src/app/page.tsx`
- Wordle card changed from `available: false` ("Σύντομα") to `available: true` and live

### Tests — 27 new tests (129 total)
- `src/test/evaluateGuess.test.ts` — 7 tests: exact, absent, present, mixed, duplicate-letter edge cases
- `src/test/wordleReducer.test.ts` — 11 tests: ADD_LETTER caps, DELETE_LETTER, SUBMIT_GUESS (short/invalid/valid/win/6-loss), RESTORE_STATE
- `src/test/wordleLogic.test.ts` — 9 tests: scoreWordle (all 4 cases), buildLetterStateMap (correct beats present beats absent, unknown)

### Definition of done — verified ✅
- [x] `npm run test` — 129/129 pass
- [x] `npm run build` — clean, `/wordle` compiles as Dynamic (server-rendered)
- [x] Spelling Bee at `/spelling-bee`, game picker at `/`
- [x] Hamburger menu in Shell on every screen
- [x] `/wordle` and `/connections` render stubs
- [x] Persistence delegates to `wordgames:state` envelope; legacy `spelling-bee:state` migrated on first load
- [x] No cross-game localStorage leakage (structurally enforced by TypeScript types)

### Next session
Phase 2 — Wordle GR: `WordlePuzzle` types, `evaluateGuess` pure function, `wordleReducer`, `useWordleState`, puzzle data file, and UI components. See `goals.md`.

## 2026-05-12 — Session 1: Architecture Planning
- Conducted 7-question architecture interview
- Produced PRD for multi-game platform
- Created agent files and prompt
- Updated README


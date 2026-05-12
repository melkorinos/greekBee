# Agent Goals — Greek Word Games Platform

## North Star
Ship a polished multi-game Greek word game platform where Spelling Bee, Wordle GR, and Connections coexist cleanly — sharing a shell, persistence layer, and design foundation — without any game's logic bleeding into another's.

## Phase 1 — Foundation ✅ COMPLETE
- [x] **Restructure:** Move Spelling Bee into `src/games/spelling-bee/` skeleton; establish new folder layout without breaking the existing game
- [x] **Shell + Routing:** Implement `src/components/shared/Shell.tsx` with hamburger menu; add routes `/spelling-bee`, `/wordle`, `/connections`, `/`; move current `page.tsx` to `/spelling-bee/page.tsx`
- [x] **`useGameStore`:** Implement unified localStorage envelope (`wordgames:state`); migrate `usePersistence` to use it; verify no cross-game leakage
- [x] **Types split:** Extract `Language`, `GameId`, `PersistenceEnvelope` into root `src/types/index.ts`; move Spelling Bee-specific types to `src/games/spelling-bee/types.ts`

## Phase 2 — Wordle GR ✅ COMPLETE
- [x] Design `WordlePuzzle`, `WordleState`, `TileState`, `GuessResult`, `LetterStateMap` types
- [x] Implement `evaluateGuess` pure function (two-pass, duplicate-letter-safe)
- [x] Build `wordleReducer` + `useWordleState` hook
- [x] Deterministic daily answer via `getTodaysWordlePuzzle` (date → stable index into sorted word list)
- [x] Build `GuessGrid`, `Tile`, `Keyboard`, `WordleBoard` components
- [x] Wire `/wordle/page.tsx` (5-letter game, server component)
- [x] Wordle persistence slice (`wordle.5` nested inside `wordgames:state`)
- [x] Generate `src/data/wordle/words-5.json` (9,568 words via `normalize-wordlist.mjs`)
- [x] Normalize full dictionary: `words-el.json` → lowercase, no accents, ς→σ (original backed up as `words-el.raw.json`)
- [x] 27 new tests: `evaluateGuess` (7), `wordleReducer` (11), `wordleLogic` (9) — total 129 passing
- [x] Curated answer pool: `answers-5.json` (~3.8k everyday words) — `words-5.json` remains full valid-guess list
- [x] 14 new data-loader tests (`wordleDataLoader.test.ts`) — total 143 passing
- [x] `words-el.json` committed to repo (pre-normalised, no-accent form); `words-el.raw.json` + `words-*.json` gitignored

## Phase 2.5 — Theming (Dark / Light per game)
> **Decision:** Wordle is dark-themed. Spelling Bee and the Shell top bar are light-themed.
> Each game owns its own background and foreground; the Shell header is always light.

- [x] **Shell header** — confirmed light (`bg-white`, `text-stone-800`); no dark: classes present; always-light is structurally enforced
- [x] **Spelling Bee** — confirmed light theme; no dark: classes in any component; no changes needed
- [x] **Wordle** — full dark theme: `bg-zinc-900 text-stone-100` on page root; all `dark:` classes removed from Tile, Keyboard, WordleBoard and replaced with unconditional dark equivalents
- [x] **Game picker** (`/`) — confirmed light theme; no dark classes; no changes needed
- [x] **Globals** — no global `dark:` classes; theming is explicit per-route, not system-preference driven
- [ ] **Tests** — update `Shell.test.tsx` and add `wordleTheme.test.tsx` smoke test (deferred to next session)

## Phase 3 — Connections
- [ ] Design `ConnectionsPuzzle` and `ConnectionsState` types
- [ ] Define `puzzles-connections.json` schema and seed with first real puzzle
- [ ] Build `useConnectionsState` hook + `connectionsReducer`
- [ ] Build `GroupGrid`, `WordCard`, `CategoryReveal` components
- [ ] Wire `/connections/page.tsx`
- [ ] Connections persistence slice
- [ ] Connections puzzle validator script (`scripts/validate-connections.mjs`)

## Phase 4 — Polish
- [ ] Wordle length variants (3–8): generate `words-N.json` + `answers-N.json`, add `/wordle/[length]` dynamic route, add variant picker
- [ ] Home page “played today” status badge per game (read from `useGameStore`)
- [ ] E2E tests (Playwright) for at least one happy-path per game
- [ ] Visual rebrand — introduce Tailwind theme config; decouple from NYT aesthetic
- [ ] Spelling Bee puzzle quality filter (enforce ≥2 vowels, ≥2 consonants, centre = vowel, ≥1 pangram)
- [ ] Per-puzzle leaderboard (Supabase backend, device UUID, `POST /api/scores`)

## Constraints (never violate)
- Game logic stays pure functions — zero React imports in `src/games/*/lib/`
- Each game only reads/writes its own `useGameStore` slice
- No component graduates to `shared/` speculatively — only when two games need it
- Tests must pass after every phase

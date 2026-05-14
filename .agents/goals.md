# Agent Goals — Greek Word Games Platform

## North Star
Ship a polished multi-game Greek word game platform where Spelling Bee, Wordle GR, and Connections coexist cleanly — sharing a shell, persistence layer, and design foundation — without any game's logic bleeding into another's.

---

## ✅ Phases 1–3 — COMPLETE (2026-05-12)

| Phase | Summary |
|---|---|
| 1 — Foundation | Folder restructure; Shell + routing; `useGameStore` unified persistence; types split |
| 2 — Wordle GR | 5-letter Greek Wordle live; `evaluateGuess`; reducer + hook; deterministic daily answer; curated answer pool; 143 tests |
| 2.5 — Theming | Wordle + Shell dark theme via unconditional classes; SB/picker light; no `dark:` Tailwind classes; `FeedbackBanner` graduated to shared; 151 tests |
| 3 — Connections | Full game live; reducer (4 mistakes, one-away hint); validator script; 167 tests |

Key locked ADRs → see `memory.md`.

---

## Phase 4 — Polish (NEXT)
- [ ] Wordle length variants (3–8): generate `words-N.json` + `answers-N.json`; add `/wordle/[length]` dynamic route; add variant picker
- [ ] Home page "played today" status badge per game (read from `useGameStore`)
- [ ] E2E tests (Playwright) — at least one happy-path per game
- [ ] Visual rebrand — introduce Tailwind theme config; decouple from NYT aesthetic
- [ ] Spelling Bee puzzle quality filter (≥2 vowels, ≥2 consonants, centre = vowel, ≥1 pangram)
- [ ] Per-puzzle leaderboard (Supabase backend, device UUID, `POST /api/scores`)

---

## Constraints (never violate)
- Game logic stays pure functions — zero React imports in `src/games/*/lib/`
- Each game only reads/writes its own `useGameStore` slice
- No component graduates to `shared/` speculatively — only when two games need it
- `npm run test -- --run`, `npm run build`, and `npx eslint .` must all pass (0 errors) after every meaningful change
- No inline styles — Tailwind utility classes only
- Do not install new dependencies without explicit approval

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
> **Decision:** Wordle and the Shell header are dark-themed. Spelling Bee and the picker are light-themed.
> Each game owns its own background and foreground; the Shell header is unconditionally dark.

- [x] **Shell header** — dark theme (`bg-stone-900`, `text-stone-300`); no dark: classes; unconditional dark applied directly
- [x] **Spelling Bee** — confirmed light theme; no dark: classes in any component; no changes needed
- [x] **Wordle** — full dark theme: `bg-zinc-900 text-stone-100` on page root; all `dark:` classes removed from Tile, Keyboard, WordleBoard and replaced with unconditional dark equivalents
- [x] **Game picker** (`/`) — confirmed light theme; no dark classes; no changes needed
- [x] **Globals** — no global `dark:` classes; theming is explicit per-route, not system-preference driven
- [x] **Tests** — `Shell.test.tsx` asserts `bg-white` on header; `wordleTheme.test.tsx` smoke-tests Tile + Keyboard dark classes; 151/151 passing

## Phase 3 — Connections
- [x] Design `ConnectionsPuzzle` and `ConnectionsState` types
- [x] Define `puzzles-connections.json` schema and seed with first real puzzle
- [x] Build `useConnectionsState` hook + `connectionsReducer`
- [x] Build `GroupGrid`, `WordCard`, `CategoryReveal` components
- [x] Wire `/connections/page.tsx`
- [x] Connections persistence slice
- [x] Connections puzzle validator script (`scripts/validate-connections.mjs`)
- [x] Graduate `FeedbackBanner` to `src/components/shared/` — used by Wordle (dark) and Connections (light)
- [x] Tests: `connectionsReducer.test.ts` (14 unit tests) + `connectionsGroupGrid.test.tsx` (5 RTL tests)
- [x] Home page Connections card: `available: true`

## Phase 4 — Polish
- [ ] Wordle length variants (3–8): generate `words-N.json` + `answers-N.json`, add `/wordle/[length]` dynamic route, add variant picker
- [ ] Home page “played today” status badge per game (read from `useGameStore`)
- [ ] E2E tests (Playwright) for at least one happy-path per game
- [ ] Visual rebrand — introduce Tailwind theme config; decouple from NYT aesthetic
- [ ] Spelling Bee puzzle quality filter (enforce ≥2 vowels, ≥2 consonants, centre = vowel, ≥1 pangram)
- [ ] Per-puzzle leaderboard (Supabase backend, device UUID, `POST /api/scores`)- [ ] **Spelling Bee archive page** — list the 7 most recent daily puzzles with their dates and a "Play" link; let returning players catch up on days they missed; read directly from `puzzles-el.json` date index
## Constraints (never violate)
- Game logic stays pure functions — zero React imports in `src/games/*/lib/`
- Each game only reads/writes its own `useGameStore` slice
- No component graduates to `shared/` speculatively — only when two games need it
- Tests must pass after every phase

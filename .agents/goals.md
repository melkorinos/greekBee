# Agent Goals — Greek Word Games Platform

## North Star
Ship a polished multi-game Greek word game platform where Spelling Bee, Wordle GR, and Connections coexist cleanly — sharing a shell, persistence layer, and design foundation — without any game's logic bleeding into another's.

## Phase 1 — Foundation ✅ COMPLETE
- [x] **Restructure:** Move Spelling Bee into `src/games/spelling-bee/` skeleton; establish new folder layout without breaking the existing game
- [x] **Shell + Routing:** Implement `src/components/shared/Shell.tsx` with hamburger menu; add routes `/spelling-bee`, `/wordle`, `/connections`, `/`; move current `page.tsx` to `/spelling-bee/page.tsx`
- [x] **`useGameStore`:** Implement unified localStorage envelope (`wordgames:state`); migrate `usePersistence` to use it; verify no cross-game leakage
- [x] **Types split:** Extract `Language`, `GameId`, `PersistenceEnvelope` into root `src/types/index.ts`; move Spelling Bee-specific types to `src/games/spelling-bee/types.ts`

## Phase 2 — Wordle GR
- [ ] Design `WordlePuzzle` and `WordleState` types
- [ ] Implement `evaluateGuess` pure function (correct / wrong-position / absent)
- [ ] Build `wordleReducer` + `useWordleState` hook
- [ ] Create `scripts/wordle/generate-puzzle.ts` (picks answer by length + date from `words-el.json`)
- [ ] Build `GuessGrid`, `Tile`, `Keyboard`, `VariantPicker` components
- [ ] Wire `/wordle/page.tsx` (picker) and `/wordle/[length]/page.tsx` (game)
- [ ] Wordle persistence slice (nested by length inside the `wordle` envelope key)

## Phase 3 — Connections
- [ ] Design `ConnectionsPuzzle` and `ConnectionsState` types
- [ ] Define `puzzles-connections.json` schema and seed with first real puzzle
- [ ] Build `useConnectionsState` hook
- [ ] Build `GroupGrid`, `WordCard`, `CategoryReveal` components
- [ ] Wire `/connections/page.tsx`
- [ ] Connections persistence slice

## Phase 4 — Polish
- [ ] Game picker home page (`/`) with cards per game
- [ ] Operator tooling: simple JSON editor or validation script for Connections puzzles
- [ ] Wordle answer pool curation (filtered subset of `words-el.json` by length)
- [ ] E2E tests (Playwright) for at least one happy-path per game
- [ ] Visual rebrand (decouple from NYT aesthetic) — introduce Tailwind theme config at this point

## Constraints (never violate)
- Game logic stays pure functions — zero React imports in `src/games/*/lib/`
- Each game only reads/writes its own `useGameStore` slice
- No component graduates to `shared/` speculatively — only when two games need it
- Tests must pass after every phase

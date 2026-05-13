# Agent Memory — Greek Word Games Platform

## ⚡ Current State (2026-05-13)
Three live games + custom puzzle URLs. **277 tests passing.**

| Game | Route | Status |
|------|-------|--------|
| Spelling Bee | `/spelling-bee` + `/spelling-bee/[center]/[outer]` | Live — daily + custom URL |
| Wordle GR | `/wordle` | Live — 5-letter Greek |
| Connections | `/connections` | Live — hand-curated |

---

## 🔒 Locked Architecture Decisions (do not re-litigate)

| Topic | Decision |
|-------|----------|
| **Routing** | `/spelling-bee`, `/wordle`, `/connections`, `/` game picker. Custom puzzle: `/spelling-bee/[center]/[outer]` |
| **Persistence** | Single `wordgames:state` localStorage key; typed envelope. `useGameStore` is the ONLY code that touches localStorage |
| **Types** | Root `src/types/index.ts` = `Language`, `GameId`, `PersistenceEnvelope` only. Game types live in `src/games/*/types.ts` |
| **Theming** | Wordle = dark (`bg-zinc-900` unconditional on `<main>`). Spelling Bee + Shell = light. No `dark:` Tailwind classes anywhere |
| **Game logic** | Pure functions in `src/games/*/lib/` — zero React imports |
| **Shared components** | Earn their place: only graduate to `src/components/shared/` when 2 games genuinely need it |
| **Connections** | No `language` field on `ConnectionsPuzzle` — it has no word-list dependency |
| **Custom puzzle ID** | `custom-{center}-{sortedOuter}` — letter-derived only; not date-scoped so localStorage survives refreshes |
| **No Greek accents anywhere** | Zero accents in URLs, stored state, puzzle letter fields, valid-word output. Enforced by `noAccents.test.ts`. `normalizeLetters()` is the single normalisation point — call it at every entry boundary. |
| **ShareButton `canonicalPath`** | Server builds the share path from normalised letters; client prepends `window.location.origin`. Accent-free by construction. |
| **Custom URL canonical redirect** | If raw URL params differ from their normalised form, server 301-redirects before rendering. Players always land on the clean URL. |

---

## 📁 Actual Folder Structure (as built)

```
src/
  app/
    layout.tsx, page.tsx (picker)
    spelling-bee/page.tsx, [center]/[outer]/page.tsx
    wordle/page.tsx
    connections/page.tsx, ConnectionsBoard.tsx
  components/
    shared/          Shell, FeedbackBanner, HowToPlayModal
    spelling-bee/    GameBoard, HoneycombGrid, WordInput, ScoreBar, FeedbackMessage, FoundWordsList, ShareButton (`canonicalPath` prop), NewPuzzleButton
    wordle/          WordleBoard, GuessGrid, Tile, Keyboard
    connections/     GroupGrid, WordCard, CategoryReveal
  games/
    spelling-bee/lib/  validation, scoring, ranking, pangram, normalize, computeValidWords, parseCustomUrl
    spelling-bee/hooks/  gameReducer, useGameState
    wordle/lib/        evaluateGuess, isValidGuess
    wordle/hooks/      wordleReducer, useWordleState
    connections/hooks/ connectionsReducer, useConnectionsState
  data/
    spelling-bee/    puzzles-el.json (1008 puzzles 2026-03-25→2028-12-26), index.ts
    wordle/          answers-5.json, words-5.json, index.ts
    connections/     puzzles-connections.json, index.ts
    words-el.json    (811k words, normalised — statically imported by buildCustomPuzzle)
  hooks/             useGameStore.ts, usePersistence.ts
  types/             index.ts
  test/              22 test files — 277 tests
```

---

## 💾 Data Files: Git Status

| File | Committed | Notes |
|------|-----------|-------|
| `src/data/words-el.json` | ✅ | 811k normalised Greek words; used by `buildCustomPuzzle` |
| `src/data/spelling-bee/puzzles-el.json` | ✅ | 1008 curated daily puzzles; still has pre-computed `validWords` (tech debt #1) |
| `src/data/wordle/answers-5.json` | ✅ | ~3,839 curated everyday words |
| `src/data/wordle/words-5.json` | ✅ | ~9,568 full valid-guess list |
| `src/data/words-el.raw.json` | ❌ gitignored | 826k original accented source |

---

## 🛠 Known Tech Debt

1. **`puzzles-el.json` validWords are pre-computed accented** — `getPuzzleIndex` still normalises them at load time. After re-running batch generator against `words-el.json`, that `.map(normalizeLetters)` call can be removed and file size shrinks significantly.
2. **`usePersistence` does not save `puzzleMaxScore`** — recomputed from scratch on restore; minor perf issue.
3. **English puzzle path dormant** — `puzzles-en.json` exists but nothing uses it.
4. **No E2E tests** — no Playwright/Cypress.
5. **Wordle length variants deferred** — architecture supports 3–8; word lists not yet generated.
6. **Mobile physical keyboard gap** — `window.keydown` in Wordle works on desktop only; no test verifying mobile on-screen keyboard path.

---

## 🧪 Test Coverage Map (21 files, 257 tests)

| File | What it covers |
|------|---------------|
| `evaluateGuess.test.ts` | Wordle tile-state algorithm (duplicates, correct/present/absent) |
| `wordleLogic.test.ts` | Wordle guess validation, scoring |
| `wordleReducer.test.ts` | All Wordle reducer actions |
| `wordleDataLoader.test.ts` | Daily answer selection, determinism, pool membership |
| `wordleTheme.test.tsx` | Tile + Keyboard dark-theme classes |
| `gameLogic.test.ts` | SB: isPangram, scoreWord, maxScore, calculateRank, validateWord |
| `gameReducer.test.ts` | All Spelling Bee reducer actions |
| `GameBoard.test.tsx` | SB board — keyboard, hex clicks, submit, feedback |
| `greekLogic.test.ts` | Greek Unicode integration for SB logic |
| `spellingBeeDataLoader.test.ts` | getPuzzleForDate, getPuzzleById, getRandomPuzzle, getNextPuzzle |
| `computeValidWords.test.ts` | computeValidWords — filters, normalization, edge cases |
| `customPuzzle.test.tsx` | buildCustomPuzzle shape + ShareButton clipboard states |
| `parseCustomUrl.test.ts` | URL param validation: valid, invalid center/outer, uniqueness |
| `normalize.test.ts` | normalizeLetters: case, accent stripping, final sigma, idempotency |
| `noAccents.test.ts` | **No-accent contract** across all surfaces: 1,008 curated puzzle letter fields, buildCustomPuzzle output, computeValidWords output, parseCustomUrl output + URL path, gameReducer stored words, data loader returns |
| `connectionsReducer.test.ts` | All Connections reducer actions |
| `connectionsGroupGrid.test.tsx` | GroupGrid component — render, selection, solved state |
| `connectionsDataLoader.test.ts` | getTodaysConnectionsPuzzle, puzzle shape contract |
| `persistence.test.ts` | loadPersistedState, clearPersistedState, legacy migration |
| `useGameStore.test.ts` | readSlice, writeSlice, clearSlice — cross-game isolation |
| `Shell.test.tsx` | Hamburger open/close, drawer, Escape, backdrop |
| `deploymentReadiness.test.ts` | All statically imported data files exist + not gitignored |


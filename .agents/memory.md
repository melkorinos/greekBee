# Agent Memory — Greek Word Games Platform

## ⚡ Current State (2026-05-14)
Three live games + custom puzzle URLs. **372 tests passing.**

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
| **Theming** | Wordle + Shell header = dark (unconditional classes). Spelling Bee + picker = light. No `dark:` Tailwind classes anywhere |
| **Game logic** | Pure functions in `src/games/*/lib/` — zero React imports |
| **Shared components** | Earn their place: only graduate to `src/components/shared/` when 2 games genuinely need it |
| **Connections** | No `language` field on `ConnectionsPuzzle` — it has no word-list dependency |
| **Custom puzzle ID** | `custom-{center}-{sortedOuter}` — letter-derived only; not date-scoped so localStorage survives refreshes |
| **No Greek accents anywhere** | Zero accents in URLs, stored state, puzzle letter fields, valid-word output. Enforced by `noAccents.test.ts`. `normalizeLetters()` is the single normalisation point — call it at every entry boundary. |
| **ShareButton `canonicalPath`** | Server builds the share path from normalised letters; client prepends `window.location.origin`. Accent-free by construction. |
| **Custom URL canonical redirect** | If raw URL params differ from their normalised form, server 301-redirects before rendering. Players always land on the clean URL. |
| **Greeklish URL encoding** | Custom puzzle URLs use greeklish (bijective 1-to-1 Latin↔Greek, no digraphs): `a→α b→β g→γ d→δ e→ε z→ζ h→η q→θ i→ι k→κ l→λ m→μ n→ν j→ξ o→ο p→π r→ρ s→σ t→τ u→υ f→φ x→χ c→ψ w→ω`. URLs are pure ASCII (no percent-encoding needed). Old percent-encoded Greek URLs are still accepted and redirect to greeklish canonical. Utility lives in `src/lib/greeklish.ts`. |

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

1. **No E2E tests** — no Playwright/Cypress.
2. **Wordle length variants deferred** — architecture supports 3–8; word lists not yet generated.
3. **Mobile physical keyboard gap** — `window.keydown` in Wordle works on desktop only; no test verifying mobile on-screen keyboard path.

---

## 🧪 Test Coverage Map (25 files, 372 tests)

> **How to use this as an agent**: before writing a new test, grep the `describe` column for the function/component name. If it appears, read that file's describe block to check if the specific case is already covered. Only write new tests for gaps.

| File | `describe` blocks (= what is tested) |
|------|---------------------------------------|
| `evaluateGuess.test.ts` | `evaluateGuess` — all-correct, all-absent, present, mixed, duplicate answer letters, duplicate guess letters, length |
| `wordleLogic.test.ts` | `isValidGuess`, `getTodaysWordlePuzzle` determinism |
| `wordleReducer.test.ts` | `ADD_LETTER`, `DELETE_LETTER`, `SUBMIT_GUESS` (win/loss/invalid), `RESTORE_STATE` |
| `gameLogic.test.ts` | `isPangram`, `scoreWord`, `maxScore`, `calculateRank`, `validateWord` |
| `gameReducer.test.ts` | All 7 Spelling Bee reducer actions including `RESTORE_STATE` preserving `puzzleMaxScore` |
| `greekLogic.test.ts` | `isPangram (Greek)`, `scoreWord (Greek)`, `calculateRank`, `validateWord`, `getPuzzleForDate` (data-independent: asserts vowel center, not specific letter) |
| `GameBoard.test.tsx` | Rendering, keyboard input, word submission, button interactions |
| `useGameStore.test.ts` | `readSlice`, `writeSlice`, `clearSlice`, migration from legacy key |
| `Shell.test.tsx` | Hamburger open/close, navigation links, keyboard dismiss |
| `persistence.test.ts` | `usePersistence` + `loadPersistedState` delegation to `useGameStore` |
| `wordleDataLoader.test.ts` | `getWordleWords`, `getTodaysWordlePuzzle`, `getWordleAnswers` |
| `spellingBeeDataLoader.test.ts` | `getPuzzleIndex`, `getPuzzleForDate`, `getPuzzleById`, `getRandomPuzzle` |
| `spellingBeeRouting.test.ts` | All 1008 canonical greeklish URLs parse without 404; center/outer round-trip |
| `connectionsReducer.test.ts` | `TOGGLE_WORD`, `SUBMIT_SELECTION`, `RESTORE_STATE`, one-away hint |
| `connectionsGroupGrid.test.tsx` | `GroupGrid` renders solved groups |
| `connectionsDataLoader.test.ts` | `getConnectionsPuzzleForDate`, fallback |
| `letterPickerModal.test.tsx` | Visibility, center/outer selection, deselect, 7-letter cap, Reset, Random (vowel center × 20, ≥2 vowels × 20, ≥2 outer consonants × 20), Generate |

| File | `describe` blocks (= what is tested) |
|------|---------------------------------------|
| `evaluateGuess.test.ts` | `evaluateGuess` — all-correct, all-absent, present, mixed, duplicate answer letters, duplicate guess letters, length |
| `wordleLogic.test.ts` | `isValidGuess`, `getTodaysWordlePuzzle` determinism |
| `wordleReducer.test.ts` | `wordleReducer — ADD_LETTER`, `DELETE_LETTER`, `SUBMIT_GUESS` (short/invalid/valid/win/lose) |
| `wordleDataLoader.test.ts` | `getTodaysWordlePuzzle`, `getAnswerPool`, `getValidWords`, `getTodayDateString` |
| `wordleTheme.test.tsx` | `Tile dark theme classes`, `Keyboard dark theme classes` |
| `gameLogic.test.ts` | `isPangram`, `scoreWord`, `maxScore`, `calculateRank`, `validateWord` |
| `gameReducer.test.ts` | `buildInitialState`, `ADD_LETTER`, `DELETE_LETTER`, `CLEAR_INPUT`, `SUBMIT_WORD — valid`, `SUBMIT_WORD — invalid`, `SHUFFLE_LETTERS`, `NEW_GAME`, `RESTORE_STATE` |
| `GameBoard.test.tsx` | `GameBoard rendering`, `Keyboard input`, `Hex clicks`, `Submit word`, `Feedback messages` |
| `greekLogic.test.ts` | `isPangram (Greek)`, `scoreWord (Greek)`, `validateWord (Greek)`, `getPuzzleForDate integration` |
| `spellingBeeDataLoader.test.ts` | `getPuzzleForDate`, `getPuzzleById`, `getRandomPuzzle`, `getNextPuzzle` |
| `spellingBeeRouting.test.ts` | `canonicalPath format`, `redirect round-trip — getTodaysPuzzle`, `getPuzzleForDate`, `getPuzzleById`, `getRandomPuzzle`, `all curated puzzles — redirect round-trip` (all 1,008) |
| `computeValidWords.test.ts` | `computeValidWords` — inclusion, too-short exclusion, missing center, invalid letters, accent normalisation, empty list |
| `customPuzzle.test.tsx` | `buildCustomPuzzle` — shape, accent normalisation, stable ID, word filtering, impossible combo; `ShareButton` — render, copy, success state, error state |
| `parseCustomUrl.test.ts` | `parseCustomUrl` — valid inputs, invalid center (empty/multi/digit/space), invalid outer (short/long/digit/empty), uniqueness (center in outer, outer duplicates), return shape |
| `normalize.test.ts` | `normalizeLetters` — case folding, accent stripping, final sigma ς→σ, combined inputs, edge cases |
| `noAccents.test.ts` | `hasAccent helper`; `puzzles-el.json` letter fields; `buildCustomPuzzle` output; `computeValidWords` output; `parseCustomUrl` output + URL path; `gameReducer SUBMIT_WORD` stored words; data loader spot-checks |
| `connectionsReducer.test.ts` | `SELECT_WORD`, `SUBMIT_GUESS — correct`, `SUBMIT_GUESS — wrong`, `SUBMIT_GUESS — one away`, `SHUFFLE`, `game over (loss)`, `win condition` |
| `connectionsGroupGrid.test.tsx` | `GroupGrid` — render, solved groups, selection state, onSelect callback, disabled state |
| `connectionsDataLoader.test.ts` | `allConnectionsPuzzles` shape contract, `getTodaysConnectionsPuzzle` — date match, fallback, uniqueness, shape |
| `persistence.test.ts` | `loadPersistedState` — null, wrong puzzle, restore, safe defaults; `clearPersistedState`; legacy key migration |
| `useGameStore.test.ts` | `readSlice`, `writeSlice`, `clearSlice`, `migrateFromLegacyKeys` — cross-game isolation throughout |
| `Shell.test.tsx` | `Shell rendering`, `Hamburger drawer` — open/close/Escape/backdrop, nav links, theme classes |
| `deploymentReadiness.test.ts` | All statically imported data files: exist on disk + not gitignored |


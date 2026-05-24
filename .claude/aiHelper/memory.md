# Agent Memory — Greek Word Games Platform

## ⚡ Current State (2026-05-24)
Three live games + custom puzzle URLs. **704 tests passing.**

| Game | Route | Status |
|------|-------|--------|
| Leksokipos | `/leksokipos` + `/leksokipos/[center]/[outer]` | Live — daily + custom URL |
| Leksiarxeio | `/leksiarxeio` | Live — 4–8 letter Greek, multi-length |
| Leksindeseis | `/leksindeseis` | Live — hand-curated |

---

## 🔒 Locked Architecture Decisions (do not re-litigate)

| Topic | Decision |
|-------|----------|
| **Routing** | `/leksokipos`, `/leksiarxeio`, `/leksindeseis`, `/` game picker. Custom puzzle: `/leksokipos/[center]/[outer]` |
| **Persistence** | Single `wordgames:state` localStorage key; typed envelope. `useGameStore` is the ONLY code that touches localStorage. **Known exception:** `leksokipos-variant` is a standalone key (not in the envelope) written by `LeksokiposLayout` for the grid-variant UI preference. Intentional — it is a display preference, not game state. |
| **Types** | Root `src/types/index.ts` = `Language`, `GameId`, `PersistenceEnvelope` only. Game types live in `src/games/*/types.ts`. Leksokipos puzzle type is `LeksokiposPuzzle`. |
| **Theming** | Leksiarxeio + Shell header = dark (unconditional classes). Leksokipos + picker = light. No `dark:` Tailwind classes anywhere — dark mode not yet implemented. Shared form style tokens in `src/components/leksokipos/styles.ts` (`labelClass`, `inputClass`, `inputCompactClass`, etc.) — use these for all modal inputs/labels. |
| **Game logic** | Pure functions in `src/games/*/lib/` — zero React imports |
| **Shared components** | Earn their place: only graduate to `src/components/shared/` when 2 games genuinely need it |
| **Leksindeseis** | No `language` field on `LeksindeseisPuzzle` — it has no word-list dependency |
| **Custom puzzle ID** | `custom-{center}-{sortedOuter}` — letter-derived only; not date-scoped so localStorage survives refreshes |
| **No Greek accents anywhere** | Zero accents in URLs, stored state, puzzle letter fields, valid-word output. Enforced by `noAccents.test.ts`. `normalizeLetters()` is the single normalisation point — call it at every entry boundary. |
| **ShareButton `canonicalPath`** | Server builds the share path from normalised letters; client prepends `window.location.origin`. Accent-free by construction. |
| **Custom URL canonical redirect** | If raw URL params differ from their normalised form, server 301-redirects before rendering. Players always land on the clean URL. |
| **Greeklish URL encoding** | Custom puzzle URLs use greeklish (bijective 1-to-1 Latin↔Greek, no digraphs): `a→α b→β g→γ d→δ e→ε z→ζ h→η q→θ i→ι k→κ l→λ m→μ n→ν j→ξ o→ο p→π r→ρ s→σ t→τ u→υ f→φ x→χ c→ψ w→ω`. URLs are pure ASCII (no percent-encoding needed). Old percent-encoded Greek URLs are still accepted and redirect to greeklish canonical. Utility lives in `src/lib/greeklish.ts`. |
| **Supabase** | Hosted Postgres (anon key, insert-only RLS on word_suggestions; INSERT+SELECT+UPDATE RLS on scores). Singleton client in `src/lib/supabase.ts`. `getOrCreateDeviceId()` in `useGameStore.ts` generates a stable UUID per browser stored in the `wordgames:state` envelope under `deviceId`. Same device identity is used for word suggestions and the leaderboard. Use `eyJhbGci...` JWT as anon key, not `sb_publishable_...`. |
| **Leaderboard** | Per-puzzle (daily only, `YYYY-MM-DD` puzzle IDs). `POST /api/scores` upserts; `GET /api/scores?puzzleId=&deviceId=` returns top 20 + pinned player row. Score submitted silently on every new word (only when score strictly increases). Display name stored under `displayName` in `wordgames:state`; editable in `LeaderboardModal`. 🏆 button only visible for daily puzzles. Custom puzzles never appear on the leaderboard. POST also fires a fire-and-forget DELETE to remove scores older than 7 days. |
| **Leaderboard date navigation** | Rolling 7-day pill strip (not a free-form calendar). `getRecentPuzzleDates(7)` in `src/data/leksokipos/index.ts` provides the dates server-side; passed as prop to `GameBoard` → `LeaderboardModal`. Today's pill is always the default. Past puzzles are playable via `?puzzle=YYYY-MM-DD` which uses `getPuzzleForDate` (not `getPuzzleById` — IDs have a `-el` suffix). |
| **Future renames** | If a game is renamed again, change **UI strings only** (page titles, nav labels, display copy) — not directories, types, or routes. Internal code names (`leksokipos`, `leksiarxeio`, `leksindeseis`) are stable identifiers. |
| **Multiple FlowerGrid themes** | **Built.** `FlowerGridConfig` holds all visual parameters; `DEFAULT_PIE_CONFIG` (annular sectors) and `DEFAULT_FLOWER_CONFIG` (elliptical petals) are the two named presets. The player-facing toggle lives in `LeksokiposLayout`'s header; preference persists in `leksokipos-variant` localStorage key via `useSyncExternalStore` + a module-level pub/sub store (no `useEffect`+`setState`). `FlowerGridPlayground` wraps `FlowerGrid`: in prod it uses the chosen config; in `?design` mode it shows a developer-only design panel (not tested). |

---

## 📁 Actual Folder Structure (as built)

```
src/
  app/
    layout.tsx, page.tsx (picker)
    leksokipos/page.tsx, [center]/[outer]/page.tsx
    leksiarxeio/page.tsx
    leksindeseis/page.tsx, ConnectionsBoard.tsx
  components/
    shared/          Shell, FeedbackBanner, HowToPlayModal
    leksokipos/      LeksokiposLayout (page client wrapper + variant toggle), GameBoard, FlowerGrid, FlowerGridPlayground (dev design tool; wraps FlowerGrid), WordInput, ScoreBar, FeedbackMessage, FoundWordsList, ShareButton, NewPuzzleButton
    leksiarxeio/     LeksiarxeioBoard, LeksiarxeioHeader (LeksiarxeioPageClient), GuessGrid, Tile, Keyboard, LeksiarxeioLeaderboardModal
    leksindeseis/    GroupGrid, WordCard, CategoryReveal, ConnectionsBoard, ConnectionsLeaderboardModal
  games/
    leksokipos/lib/  validation, scoring, ranking, pangram, normalize, computeValidWords, parseCustomUrl
    leksokipos/hooks/  gameReducer, useGameState
    leksiarxeio/lib/   evaluateGuess, isValidGuess
    leksiarxeio/hooks/ leksiarxeioReducer, useLeksiarxeioState
    leksindeseis/hooks/ leksindeseisReducer, useLeksindeseisState
  data/
    leksokipos/      puzzles-el.json (1008 puzzles 2026-03-25→2028-12-26), index.ts
    leksiarxeio/     words-{4..8}.json (answer pool + valid guesses, same list), index.ts
    leksindeseis/    puzzles-connections.json, index.ts
    words-el.json    (811k words, normalised — statically imported by buildCustomPuzzle)
  hooks/             useGameStore.ts, useRoundPersistence.ts, useLeksiarxeioScoreSubmission.ts, useLeksindeseisScoreSubmission.ts
  types/             index.ts
  test/              45 test files — 704 tests
```

---

## 💾 Data Files: Git Status

| File | Committed | Notes |
|------|-----------|-------|
| `src/data/words-el.json` | ✅ | 811k normalised Greek words; used by `buildCustomPuzzle` |
| `src/data/leksokipos/puzzles-el.json` | ✅ | 1008 pre-built daily puzzles; still has pre-computed `validWords` (tech debt #1) |
| `src/data/leksiarxeio/words-{4..8}.json` | ✅ | Per-length valid-word + answer pool (same list drives both); words-5.json has ~9,568 entries |
| `src/data/words-el.raw.json` | ❌ gitignored | 826k original accented source |

---

## 🛠 Known Tech Debt

Tracked as individual issues in `.claude/issue-tracker/issues/` (7 open items). See that directory for status, acceptance criteria, and open questions per item.

---

## 🧪 Test Coverage Map (45 files, 704 tests)

> **How to use this as an agent**: before writing a new test, grep the `describe` column for the function/component name. If it appears, read that file's describe block to check if the specific case is already covered. Only write new tests for gaps.

| File | `describe` blocks (= what is tested) |
|------|---------------------------------------|
| `guessGrid.test.tsx` | `GuessGrid` — no inline submit, flex-1 aspect-square tiles per length, grid max-width per length (4→210px … 7→372px, 8 full), Keyboard w-full |
| `header.test.tsx` | `LeksiarxeioPageClient` — title, 🏆 button, HowToPlay trigger, both in header row, scoring note in modal |
| `evaluateGuess.test.ts` | `evaluateGuess` — all-correct, all-absent, present, mixed, duplicate answer/guess letters, length |
| `gameLogic.test.ts` (leksiarxeio) | `scoreLeksiarxeio`, `buildLetterStateMap` |
| `leksiarxeioReducer.test.ts` | `ADD_LETTER`, `DELETE_LETTER`, `SUBMIT_GUESS` (short/invalid/valid/win/lose), `RESTORE_STATE` |
| `dataLoader.test.ts` (leksiarxeio) | `getTodaysLeksiarxeioPuzzle`, `getAllTodaysLeksiarxeioPuzzles`, `getValidWords`, `getTodayDateString` |
| `theme.test.tsx` | Tile dark theme classes, Keyboard dark theme classes |
| `gameLogic.test.ts` (leksokipos) | `isPangram`, `scoreWord`, `maxScore`, `calculateRank`, `validateWord` |
| `gameReducer.test.ts` | `buildInitialState`, `ADD_LETTER`, `DELETE_LETTER`, `CLEAR_INPUT`, `SUBMIT_WORD` (valid/invalid), `SHUFFLE_LETTERS`, `NEW_GAME`, `RESTORE_STATE` |
| `LeksokiposLayout.test.tsx` | `LeksokiposLayout` — header rendering, variant toggle (default pie, click→flower→save, click twice→pie, restore from localStorage, passes variant to GameBoard), tooFewWords warning |
| `GameBoard.test.tsx` | Rendering (inline submit absent/present at 3/4 letters), keyboard input, hex clicks, word submission, feedback messages, button interactions |
| `greekLogic.test.ts` | `isPangram (Greek)`, `scoreWord (Greek)`, `validateWord (Greek)`, `getPuzzleForDate` (data-independent) |
| `greeklish.test.ts` | `greekToGreeklish`, `greeklishToGreek` bijective codec |
| `leksokiposDataLoader.test.ts` | `getPuzzleForDate`, `getPuzzleById`, `getRandomPuzzle`, `getNextPuzzle` |
| `leksokiposRouting.test.ts` | Canonical URL format; redirect round-trip for all 1,008 pre-built puzzles |
| `computeValidWords.test.ts` | `computeValidWords` — inclusion, too-short, missing center, invalid letters, accent normalisation |
| `customPuzzle.test.tsx` | `buildCustomPuzzle` shape/normalisation/ID/filtering; `ShareButton` render/copy/success/error |
| `parseCustomUrl.test.ts` | `parseCustomUrl` — valid, invalid center, invalid outer, uniqueness checks |
| `normalize.test.ts` | `normalizeLetters` — case, accent stripping, ς→σ, edge cases |
| `noAccents.test.ts` | Accent-free invariant across puzzles, `buildCustomPuzzle`, `computeValidWords`, `parseCustomUrl`, reducer |
| `leksindeseisReducer.test.ts` | `SELECT_WORD`, `SUBMIT_GUESS` (correct/wrong/one-away), `CLEAR_FEEDBACK`, terminal guard |
| `groupGrid.test.tsx` | `GroupGrid` — render, solved groups, selection, onSelect, disabled |
| `dataLoader.test.ts` (leksindeseis) | `getTodaysLeksindeseisPuzzle` — date match, fallback, uniqueness, shape |
| `persistence.test.ts` | `useRoundPersistence` — hydration (5 cases), saving (5 cases incl. `shouldSave`), `clear()` (3 cases) |
| `useLeksiarxeioScoreSubmission.test.ts` | `useLeksiarxeioScoreSubmission` — POST fields, deviceId guard, won/lost penalty, displayName fallback, ref stability |
| `useLeksindeseisScoreSubmission.test.ts` | `useLeksindeseisScoreSubmission` — POST fields, deviceId guard, score=0 guard, dedup guard, Ανώνυμος fallback; `submitWithName` fields, guards |
| `useGameStore.test.ts` | `readSlice`, `writeSlice`, `clearSlice`, cross-game isolation |
| `Shell.test.tsx` | Rendering, hamburger drawer open/close/Escape/backdrop, nav links, theme classes |
| `letterPickerModal.test.tsx` | Visibility, center/outer selection, deselect, 7-letter cap, Reset, Random (vowel center ×20, ≥2 vowels ×20, ≥2 outer consonants ×20), Generate |
| `mobileLayout.test.tsx` | Mobile viewport rendering checks |
| `feedbackMessage.test.tsx` | Valid/pangram display, all error statuses, suggest button for `not_in_list`, `alreadySuggested` state, no suggest for other statuses |
| `suggestWordModal.test.tsx` | Visibility, word field read-only, close (✕/Cancel/backdrop), POST payload, success state, `onSuccess` called, error state, `onSuccess` not called on failure |
| `suggestions.test.ts` | `getSuggestedWords`, `markSuggested` (add/normalise/idempotent/trim), `isSuggested` (false/true/case-insensitive) |
| `wordInput.test.tsx` | Placeholder, letter display, centre-letter highlighting, inline submit absent when `canSubmit=false` or no `onSubmit`, present and callable when both provided |
| `deploymentReadiness.test.ts` | All statically imported data files: exist on disk + not gitignored |


# Agent Log — Greek Word Games Platform

> Entries newest-first. Only the two most recent sessions are kept in full. Older sessions are summarised.

---

## 2026-05-14 — Session 12: Letter Picker Modal + UI Polish ✅

**Outcome:** 372 tests (↑ from 352). Build + ESLint clean.

### New: shared LetterPickerModal (`src/components/shared/LetterPickerModal.tsx`)
Full letter-picker modal for building custom Spelling Bee puzzles. All 24 Greek letters rendered in Wordle-keyboard layout. First tap = yellow center (locked); next 6 = dark outer; tap outer to deselect; 7-letter cap disables remaining tiles; Reset clears all; Random fills all 7 at once for review; Generate enabled only when all 7 chosen, calls `onConfirm(center, outer)`. Placed in `shared/` so future games (e.g. Wordle custom word) can reuse.

### Updated: `NewPuzzleButton`
Replaced `window.confirm` + `?random=1` redirect with `LetterPickerModal`. `onConfirm` converts letters via `greekToGreeklish()` and navigates to the greeklish URL. `puzzleId`/`language` props removed (no longer needed).

### Updated: `ShareButton`
Replaced Greek text label with icon-only round button (SVG share arrow) + hover tooltip. Shows ✓ checkmark SVG on success, × SVG on error.

### Updated: Wordle `Keyboard.tsx`
Enter key: `bg-emerald-600` + wider `px-4` to stand out from regular letter keys. Delete key: unchanged stone styling.

### Tests (20 new)
- `src/test/letterPickerModal.test.tsx` — 20 tests covering visibility, center/outer selection, deselect, 7-letter cap, reset, random, generate, close
- `src/test/customPuzzle.test.tsx` — updated 3 ShareButton tests to match icon-only API (aria-label instead of text content)

---

## 2026-05-14 — Session 11: Greeklish URL Encoding ✅

**Outcome:** 352 tests (↑ from 299). Build + ESLint clean.

### Feature: greeklish custom puzzle URLs

Greek percent-encoded URLs (`%CE%BA%CE%B1%CE%B5%CE%B9%CE%BF%CF%83`) are ugly when shared. Replaced with clean ASCII greeklish encoding (e.g. `/spelling-bee/k/aeiost`).

**Design:** Bijective 1-to-1 Latin↔Greek mapping, no digraphs (digraphs cause ambiguous parses when τ+η collides with θ). The four non-obvious mappings: `q→θ`, `j→ξ`, `x→χ`, `c→ψ`. `v` and `y` are unmapped.

**New files:**
- `src/lib/greeklish.ts` — shared utility: `GREEKLISH_TO_GREEK`, `GREEK_TO_GREEKLISH`, `greekToGreeklish()`, `greeklishToGreek()`, `isGreeklish()`
- `src/test/greeklish.test.ts` — 29 tests covering map integrity, spot-checks, round-trips, `isGreeklish`

**Modified files:**
- `src/games/spelling-bee/lib/parseCustomUrl.ts` — auto-detects greeklish (pure ASCII a-z) vs Greek input; converts greeklish to Greek internally before existing validation
- `src/app/spelling-bee/[center]/[outer]/page.tsx` — canonical path now uses `greekToGreeklish()`, redirect targets greeklish form; no `encodeURIComponent` needed
- `src/app/spelling-bee/page.tsx` — redirect uses `greekToGreeklish()` instead of `encodeURIComponent`
- `src/test/parseCustomUrl.test.ts` — 9 new greeklish input tests
- `src/test/spellingBeeRouting.test.ts` — replaced "encoded redirect path" blocks with "greeklish canonical path" + "backward-compat old percent-encoded Greek URLs" blocks

**Backward compatibility:** Old bookmarks with percent-encoded Greek letters are silently accepted by `parseCustomUrl` (Greek path → normalise) and 301-redirected to greeklish canonical by the page handler.

---

## 2026-05-14 — Session 10: ERR_INVALID_CHAR Location Header Fix + Tests ✅

**Outcome:** 299 tests (↑ from 289). Build + ESLint clean.

### Bug fixed — `ERR_INVALID_CHAR` on "New Puzzle" / redirect (`500` on Vercel)

The `redirect()` calls in both spelling-bee route handlers were passing raw Greek Unicode directly into the HTTP `Location` header:
```ts
redirect(`/spelling-bee/${puzzle.centerLetter}/${puzzle.outerLetters.join("")}`);
```
Node.js rejects raw non-ASCII bytes in response headers with `ERR_INVALID_CHAR`, producing a 500. Fixed by wrapping letter segments in `encodeURIComponent()` in both files:
- `src/app/spelling-bee/page.tsx` — daily / random / by-ID redirect
- `src/app/spelling-bee/[center]/[outer]/page.tsx` — canonical-accent redirect

Next.js's dynamic route handler automatically `decodeURIComponent`s the params before passing them to the page, so the game receives the correct plain Greek letters unchanged.

### New tests (10 new tests)
- `src/test/spellingBeeRouting.test.ts` — new `describe("encoded redirect path — ASCII-safe Location header")` block: center encoded ASCII-only, outer encoded ASCII-only, decode round-trip, parseCustomUrl round-trip, all 1,008 puzzles produce ASCII-safe paths
- `src/test/wordleReducer.test.ts` — 2 regression tests for the silent-drop fix: at-cap shows `lastMessage`, message clears on next valid letter after delete

---

## 2026-05-14 — Session 9: Rapid-keystroke Input Bug Fixes ✅

**Outcome:** 289 tests (unchanged). Build + ESLint clean. Three input-reliability bugs fixed.

### Bugs fixed

**Bug 1 — `wordleReducer.ts` `ADD_LETTER` silent drop (High)**
- `src/games/wordle/hooks/wordleReducer.ts` — when `currentInput.length >= puzzle.length`, the reducer previously returned `state` unchanged with no message. Players typing past the 5-letter cap received zero feedback and the keystrokes were silently discarded — directly causing the "last 2 letters not pressed" symptom.
- Fix: return `{ ...state, lastMessage: "Μέγιστο μήκος λέξης" }` so the player sees a visible signal.

**Bug 2 — Fragile `useEffect`-with-deps keyboard listener (Medium)**
- `src/components/wordle/WordleBoard.tsx` and `src/components/spelling-bee/GameBoard.tsx` both registered `window.keydown` listeners inside a `useEffect` whose dep-array included action callbacks. Any change in those deps (e.g. `validSet` reference change, React Strict Mode double-invoke) caused the listener to be torn down and re-registered, creating a gap window during which keystrokes were dropped.
- Fix: stable ref pattern — `keyHandlerRef` holds the current handler, updated synchronously via `useLayoutEffect()` (no deps). The `window.addEventListener` `useEffect` uses empty deps `[]` and is registered exactly once for the component lifetime.

**Bug 3 — `FoundWordsList` sort on every render (Low)**
- `src/components/spelling-bee/FoundWordsList.tsx` — `[...words].sort()` ran on every `ADD_LETTER` render, adding unnecessary main-thread pressure during fast typing.
- Fix: `useMemo(() => [...words].sort(), [words])`.

### Files changed
- `src/games/wordle/hooks/wordleReducer.ts`
- `src/components/wordle/WordleBoard.tsx`
- `src/components/spelling-bee/GameBoard.tsx`
- `src/components/spelling-bee/FoundWordsList.tsx`

---

## 2026-05-13 — Session 8: No-Accent Invariant + URL Hardening ✅

**Outcome:** 277 tests (↑ from 257). No-accent contract enforced end-to-end. Canonical URL redirect added. Build + ESLint clean.

### Bug fixed
- `src/games/spelling-bee/hooks/gameReducer.ts` — `SUBMIT_WORD` now stores `normalizeLetters(state.currentInput)` instead of `state.currentInput.toLowerCase()`. Accented keyboard input could previously produce accented entries in `foundWords` and `lastSubmission.word`.

### ShareButton hardened
- `src/components/spelling-bee/ShareButton.tsx` — prop renamed `url` → `canonicalPath`; share URL is now built as `window.location.origin + canonicalPath` (path constructed server-side from normalised letters — always accent-free)
- `src/app/spelling-bee/[center]/[outer]/page.tsx` — added canonical redirect: if the raw URL letters differ from their normalised form (e.g. player typed `ά` instead of `α`), server 301-redirects to the clean URL before rendering

### New test file
- `src/test/noAccents.test.ts` — 20 tests enforcing the no-accent invariant across: `hasAccent` helper self-check, all 1,008 curated puzzles\u2019 letter fields, `buildCustomPuzzle` output, `computeValidWords` output, `parseCustomUrl` output + canonical URL path, `gameReducer SUBMIT_WORD` stored words (including accented `ADD_LETTER` edge case), data loader spot-checks.

### Key decisions locked
- **Zero Greek accents anywhere in the project** — not in URLs, not in stored state, not in puzzle letter fields, not in valid-word output. `noAccents.test.ts` is the enforcement mechanism.
- Greek letters in URLs are acceptable for sharing (modern browsers, iOS/Android, messaging apps all handle them via IRI/percent-encoding). Accented variants are canonicalised via redirect.

---

## 2026-05-13 — Session 7: Tests + ShareButton + Doc Consolidation ✅

**Outcome:** 257 tests (↑ from 199). Full coverage added for all new features. Build + ESLint clean.

### New test files (58 new tests)
- `src/test/normalize.test.ts` — 15 tests
- `src/test/spellingBeeDataLoader.test.ts` — 13 tests
- `src/test/connectionsDataLoader.test.ts` — 12 tests
- `src/test/parseCustomUrl.test.ts` — 18 tests

### Other changes
- `src/games/spelling-bee/lib/parseCustomUrl.ts` extracted from inline page code
- `src/app/spelling-bee/[center]/[outer]/page.tsx` uses `parseCustomUrl`
- `src/test/deploymentReadiness.test.ts` — added `words-el.json`
- `.agents/soul.md` — added Mandatory Post-Feature Protocol
- Agent docs condensed

---

## Earlier sessions (summarised)

| Session | Date | Outcome | Tests |
|---------|------|---------|-------|
| 6 — Custom URLs + ShareButton | 2026-05-13 | Custom `/spelling-bee/[center]/[outer]` route live; `buildCustomPuzzle`; `computeValidWords`; `ShareButton` | 199 |
| 5 — Connections | 2026-05-12 | Full Connections game live; reducer, GroupGrid, CategoryReveal; `FeedbackBanner` graduated | 167 |
| 4 — Theming | 2026-05-12 | Dark Wordle / light SB+Shell; all `dark:` classes removed | 151 |
| 1–3 — Foundation + Wordle | 2026-05-12 | Folder restructure, Shell, `useGameStore`, Wordle GR live | 143 |
- `.agents/memory.md`, `.agents/reflections.md`, `.agents/log.md` — condensed; removed stale/superseded content

---

## 2026-05-13 — Session 6: Custom Spelling Bee URLs + ShareButton ✅

**Outcome:** Custom URL puzzles live. ShareButton component added. 199 tests. Build + ESLint clean.

### Files created
- `src/games/spelling-bee/lib/computeValidWords.ts` — pure filter over `words-el.json`
- `src/data/spelling-bee/index.ts` — added `buildCustomPuzzle(center, outer, language)`
- `src/app/spelling-bee/[center]/[outer]/page.tsx` — dynamic server route; 404s on invalid params
- `src/components/spelling-bee/ShareButton.tsx` — copies URL to clipboard; 3 visual states
- `src/test/computeValidWords.test.ts` — 8 tests
- `src/test/customPuzzle.test.tsx` — 16 tests (buildCustomPuzzle + ShareButton)
- `.agents/goals.md` — added Phase 4 item: Spelling Bee archive page (last 7 daily puzzles)

### Key decisions
- Custom puzzle `id = custom-{center}-{sortedOuter}` (stable, letter-only)
- `validWords` computed server-side; client receives a fully hydrated `Puzzle` — no client word-list download
- Custom puzzles persist to localStorage like curated ones

---

## 2026-05-12 — Sessions 1–5 (summarised)

| Session | Outcome | Tests |
|---------|---------|-------|
| 1 — Architecture | Folder restructure, Shell + routing, `useGameStore`, types split | ~50 |
| 2 — Wordle GR | Full 5-letter Wordle live; `evaluateGuess`; curated answer pool | 143 |
| 2.5 — Theming | Dark Wordle / light SB+Shell; `dark:` classes removed everywhere | 151 |
| 3 — Connections | Full game live; reducer, GroupGrid, CategoryReveal; `FeedbackBanner` graduated | 167 |
| 4 — Polish prep | Deployment readiness tests; `Shell.test.tsx` assertions | 183 |


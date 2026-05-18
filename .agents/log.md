# Agent Log — Greek Word Games Platform

> Entries newest-first. Only the two most recent sessions are kept in full. Older sessions are summarised.

---

## 2026-05-18 — Session 16: Supabase Integration — Word Suggestions ✅

**Outcome:** 430 tests across 30 files. Build + ESLint clean (0 errors). No regressions.

### Features shipped
- **Supabase client** — `src/lib/supabase.ts`: singleton `getSupabaseClient()` (anon key, browser-safe). Exports `Database` interface and `WordSuggestionInsert` type for typed inserts. Client is untyped at the `createClient` level to avoid `GenericSchema` compatibility brittleness; insert payloads are typed at the call site.
- **`getOrCreateDeviceId()`** — added to `src/hooks/useGameStore.ts`. Generates a UUID v4 on first call using `crypto.randomUUID()` and persists it under `deviceId` in the `wordgames:state` envelope. SSR-safe. Shared identity column for suggestions now; leaderboard later.
- **`deviceId` in `PersistenceEnvelope`** — `src/types/index.ts` extended with `"deviceId"?: string`.
- **`POST /api/suggest-word` wired** — replaced `console.log` stub with a real Supabase insert into `word_suggestions`. Validates `word` and `deviceId` before inserting. Logs DB errors server-side; returns `{ ok: false, error: "DB error" }` on failure.
- **`SuggestWordModal`** — now imports `getOrCreateDeviceId` and includes `deviceId` in the POST body.
- **`.env.local.example`** — committed; documents `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **ESLint fix** — `GameBoard.tsx` pre-existing error (`react-hooks/set-state-in-effect`) fixed by replacing `useEffect(() => setSuggestedWords(...), [])` with a `useState` lazy initializer (SSR-safe, no effect needed).

### New files
| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Singleton Supabase client + `Database` type + `WordSuggestionInsert` |
| `.env.local.example` | Documents required env vars for local dev and Vercel |

### Human tasks remaining (not yet done)
1. Create Supabase project at supabase.com → note Project URL + anon key.
2. Run this SQL once in Supabase Studio → SQL Editor:
```sql
create table word_suggestions (
  id          uuid primary key default gen_random_uuid(),
  word        text        not null,
  player_name text,
  note        text,
  device_id   text        not null,
  status      text        not null default 'pending'
                check (status in ('pending','accepted','rejected')),
  created_at  timestamptz not null default now()
);
alter table word_suggestions enable row level security;
create policy "insert only" on word_suggestions
  for insert to anon with check (true);
```
3. Copy `.env.local.example` → `.env.local` and fill in real values (local dev).
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel dashboard → Environment Variables.

---

## 2026-05-15 — Session 15: Word-Suggestion Flow, UI Polish & Test Gap Fill ✅

**Outcome:** 430 tests across 30 files. Build + ESLint clean. No regressions.

### Features shipped
- **Landing page help icons** — `page.tsx` fully rewritten with a `GAMES` array and `GameEntry` interface. Each card is now a flex row: `<Link>` covers the main content, `<HowToPlayModal>` sits as a sibling in the right column. Eliminates invalid button-in-anchor HTML. WIP badge (🚧 amber pill) added for Wordle and Connections.
- **Tooltip text** — `HowToPlayModal` tooltip changed from "Πώς να παίξεις" → "Κανόνες" (one word, no overflow).
- **Word suggestion flow** — When a submitted word returns `not_in_list`, `FeedbackMessage` now shows a "Πρότεινέ την →" button. Clicking it opens `SuggestWordModal` (name + note fields, word read-only). On success the modal closes and the word is recorded in localStorage via `suggestions.ts` so the button changes to a greyed "Ήδη υποβλήθηκε" span. `POST /api/suggest-word` stub endpoint logs to stdout and returns `{ ok: true }`.
- **Inline submit button** — Standalone submit-button row removed from `GameBoard`. `WordInput` now accepts `onSubmit`/`canSubmit` props and renders an inline green ⏎ circle when `canSubmit=true` (≥4 letters typed). Button invisible otherwise.

### New files
| File | Purpose |
|------|---------|
| `src/app/api/suggest-word/route.ts` | POST stub, logs `{ word, playerName, note, timestamp }` |
| `src/hooks/suggestions.ts` | localStorage dedup: `getSuggestedWords`, `markSuggested`, `isSuggested` |
| `src/components/spelling-bee/SuggestWordModal.tsx` | Suggestion modal (idle/submitting/success/error states) |
| `src/test/feedbackMessage.test.tsx` | 12 tests — all statuses + suggest button variants |
| `src/test/suggestWordModal.test.tsx` | 11 tests — visibility, form, POST, success/error states |
| `src/test/suggestions.test.ts` | 10 tests — CRUD + normalisation + dedup + SSR guard |
| `src/test/wordInput.test.tsx` | 7 tests — placeholder, tile rendering, inline submit logic |

### Notable fixes during implementation
- `GameBoard.tsx` had a stray unclosed `<div>` after the submit-row removal — caught by failing tests, fixed immediately.
- `WordInput.tsx` had CRLF + Unicode corruption that blocked `replace_string_in_file`; fixed via `Set-Content -Encoding UTF8` PowerShell overwrite.

---

## 2026-05-14 — Session 13: Codebase Review & Stale-Doc / Duplicate-Code Fixes ✅

**Outcome:** 372 tests (unchanged). Build + ESLint clean. No regressions.

### Code fix — `WordleBoard.tsx` duplicate normalisation logic
`WordleBoard.tsx` had a private `normaliseChar` function that was an exact duplicate of `normalizeLetters` in `src/games/spelling-bee/lib/normalize.ts`. Removed the duplicate and added a direct import, ensuring there is now a single normalisation path for keyboard input across both games.

### Stale comment — `normalize.ts`
Removed "when Wordle GR is added — it will need it too" (Wordle has been added for months). Replaced with a correct graduation note (trigger: third game).

### Stale docs — Shell theming (memory.md, goals.md)
The Shell was changed to dark (`bg-stone-900`) in a previous session but `memory.md` and `goals.md` still said "Shell = light / bg-white". Updated both to reflect the actual dark Shell header. (The Shell test was already correct.)

### Stale docs — README.md
- Connections status: "Planned" → "Live"
- Architecture section fully rewritten to match the actual folder structure (all three games, `src/lib/greeklish.ts`, correct data files, correct hooks)

### Stale docs — memory.md test count
Updated test coverage map header from "23 files, 289 tests" to "25 files, 372 tests".

---

## 2026-05-14 — Session 14: Puzzle Quality Filter + Clean Slate Regeneration ✅

**Outcome:** 389 tests (↑ from 374). Build clean. `puzzles-el.json` replaced.

### Deletions / cleanup
- `src/data/puzzles-en.json` — deleted (English path permanently removed)
- `scripts/generate-puzzle.ts` — removed `--lang=en` from usage docs; added quality-rules comment block

### Quality rules now enforced in two places (kept in sync by comment)

**`scripts/batch-generate.ts`**
- `meetsQuality()` extended: now also requires ≥2 consonants in the outer ring
- New `hasPangram()` helper: after `findValidWords()`, rejects any combo where no valid word uses all 7 letters
- New `--start-date` CLI flag: allows a clean-slate start date to be specified
- Path bug fixed: was reading/writing `src/data/puzzles-el.json`; corrected to `src/data/spelling-bee/puzzles-el.json`

**`src/components/shared/LetterPickerModal.tsx` — `pickRandom7()`**
- Now guarantees exactly 1 extra vowel **and** at least 2 consonants in the outer ring (picks them explicitly; fills remaining 3 slots from the leftover pool)
- No pangram check here — word list is not available on the client

### Data
- `src/data/spelling-bee/puzzles-el.json` wiped and regenerated: 1008 puzzles, dates 2026-03-25 → 2028-12-26, all four quality rules met, ~33× attempt ratio

### Tests
- `letterPickerModal.test.tsx` — new test: "Random always picks at least 2 consonants in the outer ring" × 20 runs
- `greekLogic.test.ts` — `getPuzzleForDate` test made data-independent (asserts vowel property of center rather than specific letter, since regeneration changes the center)
- New test count: 389 / 389 passing

---

## 2026-05-14 — Session 13: Random Puzzle Quality Rules ✅

**Outcome:** 374 tests (↑ from 372). Build clean.

### Feature: vowel-quality constraints on random letter selection

Two rules now enforced wherever random 7-letter sets are generated:
1. **Center must be a vowel** (α/ε/η/ι/ο/υ/ω) — mandatory letter drives valid-word count; a consonant center produces near-zero words
2. **At least 1 additional vowel in the outer ring** (≥ 2 vowels total)

Implemented in two places (kept in sync by comment):
- `src/components/shared/LetterPickerModal.tsx` — `pickRandom7()` rewritten: shuffles vowels → picks center, then guarantees one extra vowel in outer + 5 random consonants/remaining
- `scripts/batch-generate.ts` — added `VOWELS` set + `meetsQuality()` guard in the generation loop; non-quality combos are skipped before the expensive `findValidWords()` call

New tests (2): `letterPickerModal.test.tsx` — "always picks a vowel as center" × 20 runs, "always picks ≥2 vowels total" × 20 runs.

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

## 2026-05-14 — Session 11: Mobile UI Fixes + Tests ✅

**Outcome:** 388 tests (↑14 from 374). Build + ESLint clean (0 errors).

### Root cause (all three issues share one source)
The Wordle keyboard row 2 — 9 keys × `min-w-[2.5rem]` (40px) + 8 × `gap-1` (4px) = **392 px** — overflowed the 360 px Pixel 6 layout viewport. This caused:
1. A horizontal drag strip with a dark body-background sliver on the left (dark mode)
2. The fixed modal backdrop spanning 392 px while `flex justify-center` placed the modal 16 px right of the visible viewport edge
3. On iPhone Safari: the expanded layout viewport prevented the fixed backdrop from fully covering the game board beneath the modal

### Fixes applied

**`src/app/globals.css`** — added `overflow-x: hidden` on `html` and `body`  
**`src/components/wordle/Keyboard.tsx`** — replaced `min-w-[2.5rem]` with `flex-1 min-w-0`; added `w-full` on each row and `px-2` on outer wrapper  
**`src/components/shared/HowToPlayModal.tsx`** — added `overflow-hidden` to modal box + `overflow-y-auto max-h-[70dvh]` to rule list

### New tests (14 new tests)
- `src/test/wordleTheme.test.tsx` — new `describe("Keyboard responsive layout classes")` block (7 tests): outer wrapper `w-full`, no `min-w-[` on any letter key, all keys have `flex-1` and `min-w-0`, all row divs have `w-full`, Enter and Delete also have `flex-1 min-w-0`
- `src/test/mobileLayout.test.tsx` (new file, 7 tests) — `describe("HowToPlayModal — overflow safety classes")`: modal box has `overflow-hidden`, rule list has `overflow-y-auto` and `max-h-[70dvh]`, modal retains `rounded-2xl`, backdrop uses `flex items-center justify-center`, modal has `w-full max-w-sm`, backdrop has `px-4`

### Root cause (all three issues share one source)
The Wordle keyboard row 2 — 9 keys × `min-w-[2.5rem]` (40px) + 8 × `gap-1` (4px) = **392 px** — overflowed the 360 px Pixel 6 layout viewport. This caused:
1. A horizontal drag strip with a dark body-background sliver on the left (dark mode)
2. The fixed modal backdrop spanning 392 px while `flex justify-center` placed the modal 16 px right of the visible viewport edge
3. On iPhone Safari: the expanded layout viewport prevented the fixed backdrop from fully covering the game board beneath the modal

### Fixes applied

**`src/app/globals.css`** — added `overflow-x: hidden` on `html` and `body`
- Locks the CSS layout viewport to the visual viewport width
- Prevents the drag/black-line symptom immediately, regardless of any overflowing child
- Fixes modal centering on Pixel 6 as a direct consequence

**`src/components/wordle/Keyboard.tsx`** — removed `min-w-[2.5rem]`; added `flex-1 min-w-0`
- Letter keys and action keys now share available width proportionally in each row
- Row 2 (9 keys, the overflow culprit) scales to ≈32 px/key on a 360 px screen — readable and no overflow
- Added `w-full` to each row div and `px-2` to the outer keyboard wrapper

**`src/components/shared/HowToPlayModal.tsx`** — added `overflow-hidden` to modal box + `overflow-y-auto max-h-[70dvh]` to rule list
- Clips any future content that might protrude on iOS Safari
- Rule list becomes independently scrollable if it exceeds 70% of the dynamic viewport height (safe on both short and tall phones)

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


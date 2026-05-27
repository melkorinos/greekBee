# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 38 — 2026-05-27: Community Puzzles Feature ✅

### Changes

1. **Review routes** (new) — `src/app/api/community-puzzles/leksiarxeio/[id]/review/route.ts` + `…/leksindeseis/[id]/review/route.ts`. `PATCH` only. `X-Admin-Secret` header auth. `approve` → `UPDATE status='approved'`; `reject` → `DELETE` row immediately.

2. **Leksiarxeio data loader** (`src/data/leksiarxeio/index.ts`) — `getAllTodaysLeksiarxeioPuzzles` is now the single async entry point. Queries `community_leksiarxeio_puzzles` (approved FIFO) first; deletes row immediately on consumption; falls back to static word-pool rotation. Returns `{ puzzles, submitter_name }`. `getTodaysLeksiarxeioPuzzle` removed (was per-length sync helper).

3. **Leksindeseis data loader** (`src/data/leksindeseis/index.ts`) — `getTodaysLeksindeseisPuzzle` is now async. Same community-first pattern. Fallback: `dateToIndex(date) % pool.length` (deterministic, replaces "most recent" fallback). Returns `{ puzzle: LeksindeseisPuzzle | null, submitter_name }`.

4. **Leksiarxeio page** (`src/app/leksiarxeio/page.tsx`) — Converted to `async` server component. Destructures `{ puzzles, submitter_name }` from loader. Renders `"Παζλ από {name}"` when non-null.

5. **Leksindeseis page** (`src/app/leksindeseis/page.tsx`) — Converted to `async`. Handles null puzzle with "Δεν υπάρχει παζλ σήμερα." empty state. Renders attribution.

6. **Submission modals** (new) — `CommunityLeksiarxeioSubmitModal.tsx` (5-word form, per-word 422 error + NominationModal link) and `CommunityLeksindeseisSubmitModal.tsx` (4 groups × category + 4 words).

7. **Landing page** (`src/app/page.tsx`) — `GameCard` accepts optional `submitButton?: ReactNode`. Leksiarxeio and Leksindeseis cards get a `SubmitPuzzleButton` (new shared component) that opens the appropriate modal.

8. **Leksikastirio** (`src/app/leksikastirio/page.tsx`) — Tab type extended: `"leksiarxeio"` and `"leksindeseis"` admin tabs visible when `?admin=<secret>`. Each fetches `GET /api/community-puzzles/{game}?status=pending` and renders approve/reject cards.

9. **Tests** — Updated `src/test/leksiarxeio/dataLoader.test.ts` and `src/test/leksindeseis/dataLoader.test.ts` for new async API + community queue paths. New `src/test/shared/communityPuzzlesReviewRoute.test.ts` (auth + approve/reject for both games).

10. **CONTEXT.md** — Database tables section updated: two new community puzzle tables documented (no `used_date` — deleted on consumption).

**Human step still needed:** Create `community_leksiarxeio_puzzles` and `community_leksindeseis_puzzles` tables in Supabase (schemas in `CONTEXT.md`). Run leksiarxeio_scores → game_scores migration (SQL in `.claude/architecture-review-20260527-203039.html`).

**819 tests pass, 2 pre-existing leaderboard failures, 0 lint errors, build clean.**

---

## Session 37 — 2026-05-27: Dark Mode Implementation ✅

### Changes

1. **`src/app/globals.css`** — Added `@custom-variant dark (&:where(.dark, .dark *))`. Removed `@media (prefers-color-scheme: dark)` block entirely. Dark mode now fires only on manual `.dark` class on `<html>`, never from OS preference.

2. **`src/hooks/useTheme.ts`** (new) — `useTheme()` hook: lazy-initialises from `localStorage["theme-preference"]`, applies `.dark` class via `useLayoutEffect` on mount, `toggle()` updates both state + class + storage. Cross-tab sync via `storage` event.

3. **`src/components/shared/Shell.tsx`** — Added ☀️/🌙 toggle button between brand and hamburger. Header: `bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800`.

4. **`src/components/leksiarxeio/`** — Tile.tsx, Keyboard.tsx, LeksiarxeioBoard.tsx, LeksiarxeioHeader.tsx, page.tsx: all dark: variants added to empty/pending/unknown states.

5. **`src/components/leksokipos/styles.ts`** — All shared tokens (inputClass, btnPrimary, etc.) now carry inline `dark:` suffixes.

6. **`src/components/leksokipos/LeksokiposLayout.tsx`** — Dark header/content bg added.

7. **`src/app/page.tsx`** — Home page: dark bg/text/card variants.

8. **`src/app/leksindeseis/page.tsx`** + **`ConnectionsBoard.tsx`** + **`WordCard.tsx`** — Full dark variants.

9. **`src/app/leksikastirio/page.tsx`** + **`NominationCard.tsx`** — Full dark variants.

10. **Modals** — `LeaderboardModal.tsx`, `ConnectionsLeaderboardModal.tsx`, `HowToPlayModal.tsx`, `NominationModal.tsx`, `LetterPickerModal.tsx` — all containers, text, and interactive elements got dark: variants.

11. **`docs/adr/0002-dark-mode-via-tailwind-custom-variant.md`** (new) — ADR documenting the `@custom-variant` decision.

12. **`CONTEXT.md`** — Added "Theme" glossary term.

13. **All 762 tests pass, 0 lint errors, build clean.**

---

## Session 36 — 2026-05-27: UI Polish — White Mode + Sidebar ✅

### Changes

1. **`src/components/leksikastirio/NominationCard.tsx`** — Admin Approve/Reject buttons replaced with compact ✓/✕ icon buttons (`w-7 h-7`) to save table row width.

2. **`src/config/games.ts`** — Leksikastirio label/title changed to Greeklish ("Leksikastirio"). Leksiarxeio emoji changed from 🟩 (boring colour square) to ✏️ (pencil).

3. **`src/app/leksikastirio/page.tsx`** — h1 heading updated to "Leksikastirio".

4. **`src/components/shared/Shell.tsx`** — Header lightened (`bg-white border-stone-200`, stone-700 text). Drawer now has two sections: "Παιχνίδια" (3 games) + divider + "Κοινότητα" (leksikastirio). `GAME_IDS` / `COMMUNITY_IDS` constants control the split.

5. **Leksiarxeio white mode** — Six files updated: `page.tsx` (`bg-white`), `LeksiarxeioHeader.tsx` (stone-800 text, removed `lightTrigger`), `LeksiarxeioBoard.tsx` (stone-200 switcher buttons, removed `theme="dark"` from FeedbackBanner), `Tile.tsx` (empty→border-stone-300/text-stone-800, pending→text-stone-800), `Keyboard.tsx` (unknown keys→stone-200/text-stone-800, delete→stone-300).

6. **Tests** — `theme.test.tsx` updated to assert light-theme classes. `Shell.test.tsx` updated from `bg-stone-900` to `bg-white`.

7. **`memory.md`** — Theming decision updated: all pages now white/light mode.

---

## Session 35 — 2026-05-26: Architecture Refactoring (Candidates 1 + 2) ✅

### Changes

1. **`src/hooks/useGameIdentity.ts`** (new) — SSR-safe hook that owns DeviceId + DisplayName initialisation (`useState` lazy initialiser with `typeof window` guard). Replaces three divergent identity patterns: `useState` in GameBoard, `useReducer + useEffect` in LeksiarxeioBoard and ConnectionsBoard.

2. **Board updates** — All three boards now call `useGameIdentity()`. LeksiarxeioBoard calls `migrateLeksiarxeioIdentity()` synchronously before the hook so the legacy UUID is promoted before `getOrCreateDeviceId()` can create a fresh one (idempotent, safe during render). Removed inline `identityReducer` from ConnectionsBoard.

3. **`src/hooks/useScoreSubmission.ts`** — Extended to cover all three games. Added `gameId: "leksiarxeio"` and `submitLength(length, attempts, won)` which posts to `/api/leksiarxeio-scores` and maps `won=false → attempts=7` penalty. Deleted `useLeksiarxeioScoreSubmission.ts`.

4. **`src/components/leksiarxeio/LeksiarxeioBoard.tsx`** — Switched from `useLeksiarxeioScoreSubmission` to `useScoreSubmission({ gameId: "leksiarxeio", ... })` using `submitLength`.

5. **Test cleanup** — Deleted `useLeksiarxeioScoreSubmission.test.ts` (replaced by `submitLength` tests in shared file). Deleted `useLeksindeseisScoreSubmission.test.ts` (8/9 tests were exact duplicates of shared file; 1 unique test moved to `useScoreSubmission.test.ts`).

6. **`src/test/shared/useGameIdentity.test.ts`** (new) — 9 tests: initial values from store, UUID format, setter isolation.

7. **Docs** — README.md and memory.md updated for accuracy. Exact test counts removed from all persistent docs.

---

## Session 34 — 2026-05-24: FlowerGrid Variant Presets + Prod Toggle ✅

### Changes

1. **`FlowerGrid.tsx`** — `DEFAULT_CONFIG` replaced by `DEFAULT_PIE_CONFIG` (annular sectors) and `DEFAULT_FLOWER_CONFIG` (elliptical petals) named presets. `DEFAULT_CONFIG = DEFAULT_PIE_CONFIG` alias preserved.

2. **`FlowerGridPlayground.tsx`** — Added `variant?` prop; prod mode renders with the matching preset. Design-panel variant toggle resets to full preset. `isDesignMode` detection moved to `useSyncExternalStore` (fixes `react-hooks/set-state-in-effect`).

3. **`LeksokiposLayout.tsx`** (new) — Client wrapper holding variant state via `useSyncExternalStore` + module-level pub/sub. Toggle button in header persists preference to `leksokipos-variant` localStorage key.

4. **`LeksokiposLayout.test.tsx`** (new) — 11 tests: header render, variant toggle, localStorage save/restore, tooFewWords warning.

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 33 | 2026-05-23 | Internal identifier rebranding: `useWordleScoreSubmission` → `useLeksiarxeioScoreSubmission`, `useConnectionsScoreSubmission` → `useLeksindeseisScoreSubmission`, all component/hook/type renames to match Greek game names. Puzzle ID strings intentionally unchanged (localStorage compat). |
| 32 | 2026-05-23 | `FlowerGrid.tsx` — SVG flower grid (teardrop petals, arc-join to center circle, `active:scale-95` press feedback). Replaced `HoneycombGrid` in GameBoard. |
| 31 | 2026-05-22 | Platform rebrand: Spelling Bee → Leksokipos, Wordle GR → Leksiarxeio, Connections → Leksindeseis. Greek rank names. All routes, slices, and components renamed. |
| 30 | 2026-05-22 | Connections leaderboard: `POST/GET /api/connections-scores`, `useConnectionsScoreSubmission`, `ConnectionsLeaderboardModal`, `ConnectionsBoard` extracted to `src/components/`. |
| 29 | 2026-05-22 | `postScore` + `upsertAndClean` shared libs; `useWordleScoreSubmission` refactored to use them. |
| 28 | 2026-05-22 | `useRoundPersistence` replaces 3 per-game persistence patterns. |
| 27 | 2026-05-22 | `CONTEXT.md` created (domain glossary). `Puzzle` → `SpellingBeePuzzle`, `getCuratedPuzzleByLetters` → `getPrebuiltPuzzleByLetters`. |
| 26 | 2026-05-21 | `flex-1 aspect-square` tiles with per-length `max-w-*`; `WordleHeader` extracted; 🏆 in header. |
| 25 | 2026-05-21 | Vercel Fluid CPU mitigations: `validWordsCache`, ISR `revalidate=3600`, Edge runtime on all API routes. |
| 24 | 2026-05-20 | `isDailyPuzzle` + `isISODate` single-source; replaced 4 inline regexes. |
| 23 | 2026-05-20 | `useScoreSubmission` + `useWordleScoreSubmission`; `useLeaderboard` `buildUrl` param. |
| 22 | 2026-05-20 | Spelling Bee Give-Up: confirm → locked game → missed words revealed; `givenUp` persisted. |
| 21 | 2026-05-19 | `maxScore` hard-capped at 500 pts (`MAX_SCORE_CAP`). |
| 20 | 2026-05-19 | Leaderboard 7-day pill strip; routing fix (`getPuzzleForDate`); DB cleanup on POST. |
| 19 | 2026-05-18 | Leaderboard `max={today}`; display-name RLS fix. |
| 18 | 2026-05-18 | `getCuratedPuzzleByLetters()`; shared `styles.ts` tokens; 🏆 button. |
| 17 | 2026-05-18 | Per-puzzle leaderboard: `POST/GET /api/scores`, `useLeaderboard`, `LeaderboardModal`, Supabase `scores`. |
| 16 | 2026-05-18 | Supabase word suggestions: `getSupabaseClient()`, `getOrCreateDeviceId()`, `POST /api/suggest-word`. |
| 15 | 2026-05-15 | `SuggestWordModal`; `suggestions.ts`; inline ⏎ submit; landing page rewrite. |
| 14 | 2026-05-14 | Puzzle quality filter (`meetsQuality`, `hasPangram`); `puzzles-el.json` regenerated (1008 puzzles). |
| 1–13 | 2026-05-12–14 | Foundation (shell, routing, persistence, types) · Wordle GR · Theming · Connections · Greeklish URLs · Mobile · No-accent invariant · Test gap fill. |

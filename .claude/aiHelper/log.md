# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 42 — 2026-05-30: Google OAuth Auth Integration ✅

### Changes

1. **`src/lib/supabase.ts`** — added `signInWithGoogle`, `signOut`, `getAuthUser` auth helpers.

2. **`src/types/index.ts`** — added `authLinked?: boolean` to `PersistenceEnvelope`.

3. **`src/hooks/useGameStore.ts`** — added `isAuthLinked()`, `setAuthLinked(value)`. `disconnectProfile()` now also clears `authLinked`.

4. **`src/hooks/useAuth.ts`** (new) — auth state hook: reads Supabase session on mount, subscribes to `onAuthStateChange`, keeps `authLinked` in store in sync. Exposes `authLinked`, `authUserName`, `signInWithGoogle`, `signOut`, `isLoading`.

5. **`src/app/auth/callback/page.tsx`** (new) — client component handling Google OAuth PKCE redirect: exchanges code → calls `POST /api/auth/link` → redirects back to saved referrer path.

6. **`src/app/api/auth/link/route.ts`** (new) — edge route that upserts `auth_user_id` on `player_profiles`, pre-populates `display_name` from Google only when blank, back-fills `auth_user_id` on `game_scores`.

7. **`src/components/shared/ProfileSection.tsx`** — added optional `authLinked`, `authUserName`, `onSignIn`, `onSignOut` props. When `authLinked`: shows "✓ [name] · Αποσύνδεση Google", hides TransferCode block. Idle mode: shows Google sign-in button above TransferCode link.

8. **`src/hooks/useLeaderboardProfile.ts`** — added optional auth props to `LeaderboardProfileProps`.

9. **All 4 LeaderboardModal components** — threaded auth props through to `ProfileSection`.

10. **`src/components/shared/HomeTrophyButton.tsx`** (new) — client component rendering 🏆 per applicable game card on landing page. Manages modal open/close + wires identity/profile/auth hooks.

11. **`src/app/page.tsx`** — added `HomeTrophyButton` to Leksokipos, Leksiarxeio, Leksindeseis, Vres Tin Frasi game cards.

12. **CONTEXT.md** — fixed "In-game Points" (now stored), retired "Attempt Total", added "Leaderboard Score (Leksiarxeio)" (sum of In-game Points, higher is better), added `AuthLinked` term, removed `leksiarxeio_scores` (already dropped), updated table count to 10, fixed "Score overloaded" ambiguity note.

13. **`docs/adr/0007-oauth-augments-device-identity.md`** (new) — documents the augment decision, merge behaviour, RLS model, TransferCode fate.

14. **`src/test/shared/useAuth.test.ts`** (new) — 8 tests: no session, session present, store init, sign-out.

**DB migration SQL** provided for user to run in Supabase dashboard (adds `auth_user_id` columns + RLS to `player_profiles` and `game_scores`).

**900 tests pass, 0 lint errors, build clean.**

---

## Session 41 — 2026-05-29: Bug Fixes (FOUC + Stavrolekso Server Error) ✅

### Changes

1. **Dark mode FOUC fix (Leksokipos)** — `globals.css`: added `.dark { --background: var(--color-stone-950) }` so `body` has the correct dark background during client-side navigation redirect (`/leksokipos` → `/leksokipos/[center]/[outer]`). The existing inline `<script>` in `layout.tsx` sets `.dark` on `<html>` before first paint; this change makes the body follow that class.

2. **Stavrolekso server component crash** — `src/app/stavrolekso/page.tsx` and `src/app/stavrolekso/[id]/page.tsx` were making self-referential `fetch()` calls without `try/catch`. If `NEXT_PUBLIC_BASE_URL` was unset (falls back to `http://localhost:3000`), the fetch threw `ECONNREFUSED` in production → "An error occurred in the Server Components render" error + Next.js error overlay (which uses Radix Dialog internally, causing the `DialogContent` accessibility warning as a secondary symptom). Fixed by replacing both fetches with direct Supabase calls.

3. **Vercel edge runtime warning** — Benign Next.js 16 Turbopack false positive. All `export const runtime = "edge"` declarations are in API routes only (confirmed by grep). The warning fires once per build whenever any API route uses edge runtime. No code fix possible or needed.

**892 tests pass, 0 lint errors, build clean.**

---

## Session 40 — 2026-05-28: Vres Tin Frasi — 4th Game, Full Implementation ✅

### Changes

1. **New game: `/vres-tin-frasi`** — Wordle-style with 3–4 word Greek phrases, 6 guesses, 4 tile states (correct/present/misplaced-word/absent).

2. **Pure logic** — `src/games/vrestifrasi/`: `types.ts`, `lib/evaluatePhraseGuess.ts` (2-pass cross-word algo), `lib/letterState.ts` (priority map), `lib/scoring.ts`, `lib/functionWordAllowlist.ts` (~50 short function words), `hooks/vresTinFrasiReducer.ts`, `hooks/useVresTinFrasiState.ts`.

3. **Data layer** — `src/data/vrestifrasi/phrases-el.json` (~80 starter phrases), `src/data/vrestifrasi/index.ts` (community-first FIFO loader), `src/app/api/community-puzzles/vrestifrasi/route.ts` + `[id]/review/route.ts`.

4. **Components** — `src/components/vrestifrasi/`: `Tile.tsx`, `PhraseGrid.tsx` (flat flex row, `flex-1 aspect-square min-w-0`), `Keyboard.tsx` (4 states + Σβήσε button), `HowToPlayModal.tsx`, `CommunityVresTinFrasiSubmitModal.tsx`, `VresTinFrasiLeaderboardModal.tsx` (sort=asc), `VresTinFrasiBoard.tsx`, `VresTinFrasiHeader.tsx`.

5. **App page** — `src/app/vres-tin-frasi/page.tsx` (`force-dynamic`, loads puzzle + merged word pools).

6. **Platform wiring** — `src/config/games.ts` (vrestifrasi entry), `src/types/index.ts` (GameId + PersistenceEnvelope), `src/components/shared/Shell.tsx` (GAME_IDS), `src/hooks/useScoreSubmission.ts` (gameId union), `/api/game-scores` GET now supports `sort=asc` param.

7. **Admin** — Leksikastirio 5th tab "Φράσεις" for community phrase review.

8. **Tests** — `src/test/vrestifrasi/`: `evaluatePhraseGuess.test.ts` (9 tests), `letterState.test.ts` (7 tests), `vresTinFrasiReducer.test.ts` (13 tests).

9. **Fixes during implementation** — HowToPlayModal: inline quotes escaped (`&quot;`); `ExTile` type aligned to `PhraseTileState` names; homepage `GAME_RULES` extended with vrestifrasi entry.

**861 tests pass, 0 lint errors, build clean.**

---

## Session 39 — 2026-05-28: Bug Fixes + Game State Restore (Leksokipos) ✅

### Changes

1. **Community puzzle word validation** — `normalizeLetters()` added to validation and storage loops in `src/app/api/community-puzzles/leksiarxeio/route.ts`. Fixes false-negative on words with final sigma ς (e.g. "κηπος" rejected because list stores "κηποσ").

2. **Leksiarxeio scoreboard labels** — Score column "Προσπάθειες" → "Σκορ"; subtitle corrected to "higher is better"; `LeksiarxeioHeader.tsx` how-to-play updated with correct formula (6 pts 1st guess → 1 pt 6th).

3. **Dark mode FOUC fix** — Missing `dark:bg-stone-950` added to Leksokipos custom-puzzle page. Synchronous inline `<script>` added to `src/app/layout.tsx` `<head>` to apply `.dark` class before first paint on all pages.

4. **Word click to report** — `FoundWordsList.tsx`: clicking the word span now triggers the report modal (in addition to the ⚑ icon).

5. **`useGameStateSync` simplified** — Push payload reduced to `{ foundWords }` only; `score` and `currentInput` dropped (score is derivable, currentInput is ephemeral).

6. **Game state restore (Leksokipos)** — `useGameState.ts` rewritten: mount-time server fetch gated on (daily + profileLinked + no local session). Restores `foundWords`, recomputes `score`/`currentRank`. Silent on network errors. Reads localStorage directly (not `state.foundWords`) to avoid race with `useRoundPersistence`'s own mount effect.

7. **Tests** — `src/test/leksokipos/useGameState.test.ts` (new): gate checks, API param shape, score recompute, empty/null server state, givenUp always false, network error silent. Pre-existing failures fixed: `getAllByText` for bold-split "Σκορ" in `header.test.tsx`; `/μεταφορά/i` regex in `leaderboardModal.test.tsx`.

8. **`CONTEXT.md` + `docs/adr/0003-game-state-cross-device-sync.md`** — `game_state` entry updated; ADR 0003 created (server-wins, no-merge decision).

**830 tests pass, 0 lint errors, build clean.**

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
| 38 | 2026-05-27 | Community puzzles: review routes, async data loaders (community-first FIFO), submission modals, admin tabs in Leksikastirio, CONTEXT.md updated. |
| 37 | 2026-05-27 | Dark mode: `@custom-variant dark` in globals.css, `useTheme` hook, ☀️/🌙 toggle in Shell, dark variants across all games and modals, ADR 0002. |
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

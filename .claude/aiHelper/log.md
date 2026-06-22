# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 43 — 2026-06-22: NYT Brand Scrub + Viewport Lock + Leksokipos Day-Change ✅

### Changes

1. **NYT game-name scrub (comments/docs only)** — replaced visible "Wordle" / "Connections" / "Spelling Bee" brand references with the Greek names (Leksiarxeio / Leksindeseis / Leksokipos) across code comments and docstrings: `leksiarxeio/types.ts`, `leksiarxeio/lib/scoring.ts`, `useRoundPersistence.ts`, `globals.css`, `Keyboard.tsx`, `Tile.tsx`, `LeksiarxeioBoard.tsx`, `LetterPickerModal.tsx`, `HowToPlayModal.tsx`, `FeedbackBanner.tsx`, `WordCard.tsx`, `ConnectionsLeaderboardModal.tsx`, `app/leksindeseis/ConnectionsBoard.tsx`, three test file-top comments, `scripts/generate-puzzle.ts`, `deploymentReadiness.test.ts` doc-comment, `README.md`, plus `soul.md` + `goals.md`.
   - **Deliberately NOT changed (frozen / identifiers):** puzzle ID format `${date}-wordle-${length}` in `data/leksiarxeio/index.ts` (localStorage compat), frozen-format ID strings in tests, component/type/file names (`ConnectionsBoard`, `ConnectionsLeaderboardModal`, `puzzles-connections.json`, `CONNECTIONS_RULES`). Handoff scoped Task 1 to comments only; identifier/file renames remain tech debt.

2. **Pinch-to-zoom lock (mobile)** — added `export const viewport: Viewport` to `src/app/layout.tsx` (`maximumScale: 1`, `userScalable: false`). Verified `<meta name="viewport" content="…maximum-scale=1, user-scalable=no">` in prerendered HTML.

3. **Leksokipos auto-advance on day change** — new hook `src/games/leksokipos/hooks/useDayChange.ts`: on mount + `visibilitychange`, if `isDailyPuzzle(puzzle)` and `puzzle.date < today` (UTC, matching `getTodaysPuzzle()`), calls `router.replace("/leksokipos")`. Wired into `GameBoard.tsx`. Custom puzzles skipped. Handles the `revalidate=3600` stale-CDN-page case.

4. **Tests** — `src/test/leksokipos/useDayChange.test.ts` (6 tests: no-redirect today, redirect on stale mount, custom skip, uses replace, visibilitychange redirect, listener cleanup). Added `next/navigation` `useRouter` mock to `GameBoard.test.tsx` (GameBoard now calls `useDayChange` → `useRouter`).

### Env note
`node_modules` had been installed on another OS (missing `@rolldown/binding-linux-x64-gnu`); ran `npm install` to restore linux native bindings so vitest/build run. Also added `Edit`/`Write` to `.claude/settings.local.json` allow-list at owner's request.

**932 tests pass, 0 lint errors, build clean.**

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
12. **CONTEXT.md** — fixed "In-game Points" (now stored), retired "Attempt Total", added "Leaderboard Score (Leksiarxeio)", added `AuthLinked` term, removed `leksiarxeio_scores`, updated table count to 10.
13. **`docs/adr/0007-oauth-augments-device-identity.md`** (new) — documents the augment decision, merge behaviour, RLS model, TransferCode fate.
14. **`src/test/shared/useAuth.test.ts`** (new) — 8 tests: no session, session present, store init, sign-out.

**DB migration SQL** provided for user to run in Supabase dashboard (adds `auth_user_id` columns + RLS to `player_profiles` and `game_scores`).

**900 tests pass, 0 lint errors, build clean.**

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 41 | 2026-05-29 | Bug fixes: dark-mode FOUC on Leksokipos client nav (`.dark` body background in globals.css); Stavrolekso server crash (self-`fetch` → direct Supabase calls); benign Turbopack edge-runtime warning documented. |
| 40 | 2026-05-28 | Vres Tin Frasi — 4th game: pure logic (`vrestifrasi/`), data loader (community-first FIFO), components, `/vres-tin-frasi` page, platform wiring, Leksikastirio "Φράσεις" admin tab, tests. |
| 39 | 2026-05-28 | Bug fixes + Leksokipos game-state restore: community word normalisation; scoreboard labels; FOUC inline `<script>` in layout; word-click report; `useGameStateSync` slimmed to `{foundWords}`; `useGameState` server-restore gating + tests; ADR 0003. |
| 38 | 2026-05-27 | Community puzzles: review routes, async data loaders (community-first FIFO), submission modals, admin tabs in Leksikastirio, CONTEXT.md updated. |
| 37 | 2026-05-27 | Dark mode: `@custom-variant dark` in globals.css, `useTheme` hook, ☀️/🌙 toggle in Shell, dark variants across all games and modals, ADR 0002. |
| 36 | 2026-05-27 | UI polish: compact ✓/✕ admin buttons; Greeklish "Leksikastirio" label; Shell header lightened + Παιχνίδια/Κοινότητα drawer split; Leksiarxeio white mode; theme tests updated. |
| 35 | 2026-05-26 | Architecture refactor: `useGameIdentity` (SSR-safe id init across 3 boards); `useScoreSubmission` extended to all games (`submitLength`); deleted per-game submission hooks/tests; identity tests. |
| 34 | 2026-05-24 | FlowerGrid variant presets (`DEFAULT_PIE_CONFIG`/`DEFAULT_FLOWER_CONFIG`); `LeksokiposLayout` toggle persisted to `leksokipos-variant`; tests. |
| 33 | 2026-05-23 | Internal identifier rebranding to Greek names (hooks/components/types). Puzzle ID strings intentionally unchanged (localStorage compat). |
| 32 | 2026-05-23 | `FlowerGrid.tsx` — SVG flower grid; replaced `HoneycombGrid` in GameBoard. |
| 31 | 2026-05-22 | Platform rebrand: Spelling Bee → Leksokipos, Wordle GR → Leksiarxeio, Connections → Leksindeseis. Greek rank names; routes/slices/components renamed. |
| 30 | 2026-05-22 | Connections leaderboard: `POST/GET /api/connections-scores`, hook, modal, board extracted to `src/components/`. |
| 29 | 2026-05-22 | `postScore` + `upsertAndClean` shared libs; submission hook refactor. |
| 28 | 2026-05-22 | `useRoundPersistence` replaces 3 per-game persistence patterns. |
| 27 | 2026-05-22 | `CONTEXT.md` created; `Puzzle` → `SpellingBeePuzzle`; `getPrebuiltPuzzleByLetters`. |
| 26 | 2026-05-21 | `flex-1 aspect-square` tiles + per-length `max-w-*`; `WordleHeader` extracted; 🏆 in header. |
| 25 | 2026-05-21 | Vercel Fluid CPU mitigations: `validWordsCache`, ISR `revalidate=3600`, Edge runtime on all API routes. |
| 24 | 2026-05-20 | `isDailyPuzzle` + `isISODate` single-source; replaced 4 inline regexes. |
| 23 | 2026-05-20 | `useScoreSubmission` + submission hook; `useLeaderboard` `buildUrl` param. |
| 22 | 2026-05-20 | Spelling Bee Give-Up: confirm → locked game → missed words revealed; `givenUp` persisted. |
| 1–21 | 2026-05-12–19 | Foundation (shell, routing, persistence, types) · Leksiarxeio · Theming · Leksindeseis · Greeklish URLs · quality filter · suggestions · per-puzzle leaderboard + 7-day strip · mobile · no-accent invariant · `maxScore` cap. |

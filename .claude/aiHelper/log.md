# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 44 — 2026-06-22: Nomination apply pipeline — puzzle re-sync + single command ✅

### Problem
`scripts/apply-nominations.mjs` applied accepted Leksikastirio Nominations to `words-el.json` + `leksiarxeio/words-{4..8}.json` but **never re-synced the embedded `validWords` in the 1008 pre-built Leksokipos puzzles** (`puzzles-el.json`). Removed words stayed scoreable; added words never became scoreable. Correctness bug for the `remove` direction.

### Decisions (via `/grill-with-docs`)
- Triage stays **manual** in the Leksikastirio admin UI (✓/✕). No vote-threshold auto-triage.
- Re-sync **coupled into `apply-nominations.mjs`** (one command, can't be forgotten) — not a separate script.
- Re-sync is **surgical, not a dict rescan**: a word's validity per puzzle is self-contained (covers letters + contains centre), so we patch only affected puzzles, preserving word order → minimal diff. No 812k-word scan / center index needed.
- "Clean rejected from backlog" = **report count only**, no deletion (rows already hidden via `status='rejected'`, retained as history).
- Empirically verified: all 200 sampled puzzles were byte-identical to a fresh recompute → data already consistent, so only genuine deltas ever diff.

### Changes
1. **`scripts/lib/resync-puzzles.mjs`** (new, pure/dep-free) — `normalise`, `puzzleAcceptsWord`, `resyncPuzzles(puzzles, {added, removed})`. Removal wins over addition; untouched puzzles keep referential identity so the writer skips them. Predicate mirrors `computeValidWords.ts`.
2. **`scripts/apply-nominations.mjs`** — imports `resyncPuzzles`; after word-list writes, patches `puzzles-el.json` (preview in `--dry-run`, write otherwise); reports rejected-nomination count; updated header comment documents the (direction × status) matrix + re-sync rationale.
3. **`package.json`** — `apply-nominations` + `apply-nominations:dry` scripts using `node --env-file-if-exists=.env --env-file-if-exists=.env.local` (loads user's gitignored `.env`). Update-dataset-only — never builds/commits.
4. **`src/test/scripts/resyncPuzzles.test.mjs`** (new) — 13 tests: predicate accept/reject, surgical add/remove, removal-wins, normalisation, order preservation, no-op identity.

### Verification
- `resyncPuzzles.test.mjs`: 13 pass. Representative batch (incl. `computeValidWords`, leksikastirio): 66 pass.
- ESLint clean; `npm run build` clean.
- **Full `npm run test -- --run` OOM-killed in this codespace** (RAM ~60% pre-consumed by VS Code/Claude; suite static-imports 812k-word lists). Not a regression — changes touch only `scripts/` + `package.json`, no `src/` runtime. Re-run the full suite on a roomier machine to reconfirm the session-43 baseline (932).
- Empirical run vs real `puzzles-el.json`: remove `επαινε` → 5 puzzles touched (exact); synthetic add → correct; no-op → identity preserved; ~100–160 ms / 1008 puzzles.

### Operator flow (unchanged trigger, now complete)
Review ✓/✕ in `/leksikastirio?admin=<secret>` → on a machine with creds in `.env`, run `npm run apply-nominations:dry` (preview) then `npm run apply-nominations` → review git diff → build & deploy.

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

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 42 | 2026-05-30 | Google OAuth augments device identity: `useAuth` hook, `/auth/callback` PKCE, `/api/auth/link` edge route (upserts `auth_user_id`, back-fills `game_scores`), `authLinked` in envelope/store, `ProfileSection` + 4 LeaderboardModals threaded, `HomeTrophyButton`, ADR 0007, CONTEXT 10-table update. DB migration SQL handed to user. |
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

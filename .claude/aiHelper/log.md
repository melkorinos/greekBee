# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 46 — 2026-06-24: Wordlist proper-noun cleanup (list finalized, not yet applied) 🟡
Derived **16,933 proper-noun removals** from `words-el.json` (812,168→795,235; 658 collision-words kept) using the Hunspell `el_GR` capitalisation signal; case-forms-not-prefixes; demonym/calendar rescues. Deliverable + local apply runbook in `.scratch/wordlist-cleanup/` (`decisions.json` = source of truth). **Full knowledge → [.claude/wordlist-proper-noun-cleanup-handoff.md](../wordlist-proper-noun-cleanup-handoff.md).** Not applied to data files; nothing committed by agent.

---

## Session 45 — 2026-06-22: Leksikastirio admin width + re-proposal warning + skill refresh ✅

### Changes
1. **Feature — admin viewport** ([src/app/leksikastirio/page.tsx](../../src/app/leksikastirio/page.tsx)) — container is now `max-w-6xl` when `isAdmin` (desktop review), `max-w-lg` otherwise (players keep the narrow mobile column).
2. **Feature — re-proposal warning** (Nomination dedup against rejected history):
   - **`src/app/api/nominations/lookup/route.ts`** (new, edge) — `GET ?word=&direction=` → `{ rejected, pending }` counts (head-only). Matches POST's storage form (lowercase+trim, same direction). Anon client (RLS already permits — review route writes with it).
   - **`src/components/shared/NominationModal.tsx`** — looks up the word (on blur for the editable Leksikastirio form; on open for a non-editable in-game flag; re-checked at submit). `rejected>0` → amber warning + **note becomes mandatory** (submit disabled until filled; inline error on the race path). `pending>0` (and not rejected) → gentle sky info banner ("vote instead"), non-blocking. Network failure → no warning, never blocks.
   - Decisions (grill, 4Q): on-blur timing · note **required** for rejected re-proposals · **no** admin rejection-reason capture (generic warning) · also flag **pending** duplicates. Source of truth = retained rejected rows (session 44 keeps them).
3. **Skill refresh** ([.claude/skills/apply-nominations/skill.md](../../.claude/skills/apply-nominations/skill.md)) — overlapped existing skill, updated in place: now uses `npm run apply-nominations[:dry]`, documents the puzzle re-sync (old text wrongly said puzzles aren't updated), the (direction × status) matrix, `.env`/`.env.local` loading, and the OOM-batch testing note.
4. **Tests** — [src/test/shared/nominationModal.test.tsx](../../src/test/shared/nominationModal.test.tsx): routed mock for lookup vs POST + `postCall()` finder; 4 new tests (rejected→warn+disabled, rejected+note→posts, pending→info+non-blocking, none→clean).

### Verification
- Batch (nominationModal + leksikastirio + scripts): **56 pass**. ESLint clean. `npm run build` clean — `/api/nominations/lookup` registered as edge.
- Full `npm run test -- --run` still OOMs in this codespace (env ceiling, see session 44) — reconfirm baseline on a roomier machine.

### Follow-ups (not built)
- Word matching is exact lowercase+trim (mirrors POST); accent variants won't dedupe. Capturing an admin rejection reason was deliberately deferred.

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

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 43 | 2026-06-22 | NYT brand scrub (comments/docs only → Greek names; IDs/file names frozen); pinch-zoom lock (`viewport` in `layout.tsx`); Leksokipos `useDayChange` auto-advance on stale-CDN day change; tests. 932 pass. |
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

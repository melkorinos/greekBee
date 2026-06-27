# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 49 — 2026-06-27: Leksokipos UI polish ✅
Six visual/UX changes, all Leksokipos-only:
1. **`btnHeaderIcon` recipe** added to `src/styles/recipes.ts` — formalises `border-stone-300` for circular header icon buttons (visible in dark mode; documented exception to the token rule, mirrors existing ShareButton pattern).
2. **VariantToggleButton** (🌸/🥧): `w-8 h-8` → `w-7 h-7` (10% smaller), `border-border` → `border-stone-300` via `btnHeaderIcon` — now visually consistent with other header icons in dark mode.
3. **NewPuzzleButton** (🎲 dice) removed from `LeksokiposLayout` header.
4. **ShareButton idle icon** changed from box-with-arrow to copy (two overlapping pages) SVG.
5. **5 feedback messages translated to Greek** in `FeedbackMessage.tsx`: `already_found` → "Ήδη βρέθηκε!", `too_short` → "Πολύ κοντή — τουλάχιστον 4 γράμματα", `missing_center` → "Πρέπει να περιέχει το κεντρικό γράμμα", `invalid_letter` → "Γράμμα εκτός λίστας", `not_in_list` → "… δεν υπάρχει στη λίστα".
6. **Give-up flow redesigned**: button moved below found-words list (was in heading row); inline confirmation removed; clicking opens a two-phase `GiveUpModal` (confirm → missed words on accept). Main page still shows MissedWordsList below found words after modal closes (Option B).
Updated tests: `feedbackMessage.test.tsx`, `LeksokiposLayout.test.tsx`, `GameBoard.test.tsx`, `recipes.test.ts`.
Verification: **984 tests pass · eslint clean · build exit 0**.

---

## Session 48 — 2026-06-27: Fix broken score cleanup + add Vercel Cron ✅
Root cause found: `upsertAndClean` in `src/lib/supabasePost.ts` built the delete query with `void` instead of `await`/`.then()` — Supabase's lazy thenable never fired. Every score ever submitted was retained. Fixed by:
- Removed the broken cleanup from `upsertAndClean` (dropped the now-unused `dateField` param; updated both callers in `game-scores/route.ts` and `game-state/route.ts`).
- Created `src/app/api/cleanup-scores/route.ts` — GET endpoint, CRON_SECRET auth, service role client, deletes `game_scores` **and** `game_state` rows older than 7 days in parallel.
- Added cron entry to `vercel.json` (daily 03:00 UTC).
- Updated `gameScoresRoute.test.ts` (removed extra enqueue for defunct cleanup call).
- Added `cleanupScoresRoute.test.ts` (9 tests covering auth, happy path, per-table error paths).
Verification: **979 tests pass (2 pre-existing timeouts unrelated) · eslint clean · build exit 0**.
**Next step:** add `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` to Vercel dashboard env vars — the cron won't work without them.

---

## Session 47 — 2026-06-27: Rank rename + full design-token consolidation (ALL of #10–19 DONE) ✅
Grilled (`/grill-with-docs`) the "consolidate shared values" idea; split it into two tracks — **content** (names live with their domain) vs **design tokens** (one platform-wide home). Wrote **ADR 0008** (CSS-variable semantic theming — revises 0002's rejection of CSS custom properties; the `.dark` toggle stays). Sliced everything into issues 13–19 via `/to-issues`.
**Implemented + verified the content track:**
- **Rank rename** — flower ladder → rising-ranks `ψαράκι · έτσι κι έτσι · οκέι · για πάμε · τζάμι · θηρίο · γκουρού · Απολυτότητα` (thresholds unchanged). `RANKS` (now `as const`) is the single source; `RankName`/`Rank` **derived** from it (`(typeof RANKS)[number]["name"]`), hand-written union deleted from `types.ts` (re-exports for back-compat). Reducer + `calculateRank` fallbacks use `RANKS[0].name`. Tests assert against `RANKS[i].name` (rename-proof). Updated CONTEXT.md, README, goals.md. Note: `ConnectionsBoard` "Άνοιγμα κατάταξης" is the common word "opening", NOT a rank — left alone.
- **Platform name** — new `src/config/platform.ts` (`PLATFORM_NAME`, registry-derived `PLATFORM_DESCRIPTION`); wired into layout metadata, picker `<h1>`, Shell header.
**Implemented + verified the design-token track foundation (#13, #14):**
- **#13 Font** — replaced Geist (latin-only, then silently overridden by an `Arial` body rule) with **Inter** (body/UI) + **JetBrains Mono** (code/tiles), both `["latin","greek"]`, wired via `@theme` (`--font-inter`/`--font-jetbrains-mono`). Greek now actually renders in the intended font.
- **#14 Semantic tokens + Leksokipos pilot** — CSS-variable tokens in `globals.css` (`surface`, `surface-raised`, `foreground`, `muted`, `border`, `brand`, `accent`, `danger`, feedback `correct/present/absent/misplaced`, plus added `inverted`/`inverted-foreground` for primary buttons and `--text-trophy` size). Light on `:root`, dark under `.dark`, exposed via `@theme inline` → utilities `bg-surface` etc. Recipes **relocated** `components/leksokipos/styles.ts` → **`src/styles/recipes.ts`** (it was already imported by 14 files incl. shared/ + 3 other games), retokenised (no `dark:` pairs). Migrated all Leksokipos components to tokens — **0 `dark:` pairs left** in `components/leksokipos/`; the issue-03 local `const styles` objects (which had NO dark variants → broken in dark mode) are now token-based. In-between shades normalised to nearest token (user-approved). Rewrote the style contract test → `recipes.test.ts` (asserts tokens + **no `dark:`**, ADR 0008).
- **Rank capitalization** — first letter of each rank capitalised (`Ψαράκι · Έτσι κι έτσι · Οκέι · Για πάμε · Τζάμι · Θηρίο · Γκουρού · Απολυτότητα`), one-line edit to `RANKS` (the payoff in action).
- **#15–19 propagation DONE** — tokenised every remaining game + shared: Leksiarxeio, Vres Tin Frasi, Leksindeseis, Stavrolekso, Leksikastirio, all `src/components/shared/`, the home picker, and custom pages. Wordle-style tiles (Leksiarxeio/Vres) use the feedback tokens `correct/present/absent/misplaced` (solid in both themes); feedback token values aligned to the real tiles (`present`=yellow-500, `absent`=stone-500, `misplaced`=purple-600). Updated the Leksiarxeio `theme.test`. **Documented exceptions** (ADR 0008) kept as intentional non-token palettes: Leksindeseis difficulty colours, the Stavrolekso "paper" crossword grid (stays light in dark mode), blue selection highlights, and amber/sky warning/info status banners.
Verification: **972 tests pass · eslint clean · build exit 0**. Issues 03/10–19 all resolved + deleted. Remaining repo `dark:` hits are comments, a JS object key, or the documented exceptions. Visual screenshot still pending (port-3000 conflict with a running dev server) — recommend a manual eyeball of each game in light + dark before deploy.
**Design-token consolidation COMPLETE.** Changing the brand colour, any surface, the trophy size, or the font is now a one-line edit in `globals.css`; renaming a rank is one line in `RANKS`.

---

## Session 46 — 2026-06-24/06-26: Wordlist proper-noun cleanup — derived then APPLIED ✅
Derived **16,933 proper-noun removals** from `words-el.json` (812,168→795,235; 658 collision-words kept) using the Hunspell `el_GR` capitalisation signal; case-forms-not-prefixes; demonym/calendar rescues. Deliverable + local apply runbook in `.scratch/wordlist-cleanup/` (`decisions.json` = authoritative source of truth). **To regenerate** (e.g. after a Hunspell update, not scripted end-to-end): re-derive from a fresh `el_GR.dic` (ISO-8859-7) using the capitalisation signal — a word that is *only* a capitalised lemma → remove; one that is *also* a lowercase common lemma → keep. Remove a proper noun's own case forms (Τουρκία→Τουρκίας) but never derived words (τουρκικός stays). Systematic rescues: months, Σάββατο/Κυριακή, demonyms (Έλληνας/Γάλλος…).
**Applied 2026-06-26** via `apply-cleanup.mjs --in-place`: fetched 10 admin-approved additions from Supabase (8 net new), merged with the 16,933 removals in one local pass → `words-el.json` 812,168→**795,243**, `leksiarxeio/words-{4..8}.json` shrunk, `puzzles-el.json` re-synced (1006/1008 puzzles, −24,902/+47 validWords). Verified: eslint clean · build exit 0 · **949 tests pass** · puzzle scan shows **0** removed-words surviving in any `validWords` (was 24,902). Supabase step 4 done (10 addition rows `reviewed_at=now()`, queue now empty). `npm install` pulled missing `@playwright/test` devDep → `package-lock.json` touched. Data committed manually by user.

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

# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 65 — 2026-07-05: Fixed `game_scores` prune contradicting ADR 0012 append-forever (issue 03, `/tdd`) ✅
Latent bug: daily `/api/cleanup-scores` cron deleted `game_scores` older than 10 days, so "Lifetime" Stats were really last-10-days and Epic B's `syllektis-ponton` was blocked. Fix = stop pruning `game_scores`; keep pruning the ephemeral tables. Uncommitted at session end.
1. **TDD red→green** — flipped `cleanupScoresRoute.test.ts` to assert the route **never** deletes `game_scores` (mock records `.delete()` tables) while still pruning `game_state`/`transfer_codes`; flipped `cleanupScoresLiveDb.test.ts` (game_state pruned, game_scores retained); added a regression lock to `profileStatsRoute.test.ts` (stats query applies **no** `puzzle_date` filter, full history counted).
2. **`retention.ts`** — `SCORE_RETENTION_DAYS`→`SESSION_RETENTION_DAYS` (governs `game_state`+`transfer_codes` only); dropped dead `LEADERBOARD_WINDOW_DAYS` + its guard.
3. **`cleanup-scores/route.ts`** — removed the `game_scores` delete + the `SCORE_RETENTION_DAYS<=LEADERBOARD_WINDOW_DAYS` guard; updated header comment (route name kept legacy → no `vercel.json` churn); response drops `scores` field.
4. **Docs** — ADR 0012 + CONTEXT.md amended (append-forever now *implemented*, was policy-only). Both achievements handoffs' blocker/sequencing notes flipped to ✅ (Epic B `syllektis-ponton` unblocked; Lane B no longer races a prune). Issue 03 file deleted.
5. **Gates:** 1291 pass / 6 skipped · eslint 0 · build 0. (Live-DB cleanup test skips locally — no prod secrets.)

---

## Session 64 — 2026-07-05: Fluid Active CPU investigation + fixes 3/4 shipped, 1/2 handed off ✅
Gauge at 2h31m/4h. Investigated all server CPU consumers; artifacts in `.claude/aiHelper/fluid-cpu/` (analysis.md = findings/measurements, HANDOFF-fixes-1-2.md = next agent's brief). **~90% of traffic is Leksokipos** (user-provided) — reframed priorities.
1. **Fix 3 shipped** — `/leksokipos` redirect page no longer parses 23.5 MB per cold start: new `src/data/leksokipos/puzzleIndex.ts` + generated `puzzles-index-el.json` (108 KB; `npm run generate-puzzle-index`, script in `scripts/generate-puzzle-index.mjs`). Drift-guard + parity tests in `src/test/leksokipos/puzzleIndex.test.ts`; deploymentReadiness list extended. Verified in `.next`: route's biggest chunk 22.15 MB → 0.2 MB.
2. **Fix 4 shipped** — `[center]/[outer]` `revalidate` 3600→604800 (content changes only on deploy; 24× fewer regenerations, each of which re-parsed the 22 MB chunk).
3. **Measured** (prod build + dead-Supabase env to avoid prod consume): `/leksiarxeio` + `/vres-tin-frasi` serialize **2.4 MB per view**, ~150–190 ms CPU over light dynamic pages. Given 10% traffic share → items 1 (payload) & 2 (ISR + once-per-day consume) are UX/correctness fixes more than CPU fixes; `consumeApprovedPuzzle`-per-view is a real bug (queue drains per view, same-day visitors can diverge).
4. **Handed off** items 1+2 (`/tdd` mandated, verification steps included). Uncommitted at session end (tree also carries unrelated nominations/layout edits from another session).
5. **Gates:** 1274 pass / 6 skipped · eslint 0 · build 0. (One-off flake: `gameReducer RESTORE_STATE` — green in isolation + rerun.)

---

## Session 63 — 2026-07-04: Feedback feature — text → email (grill-with-docs → /tdd) ✅
Player-facing Feedback surface: free-text message emailed to the maintainer. Grilled the design first, then built via `/tdd`. Uncommitted at session end.
1. **Design (grill-with-docs)** — chose a **form-to-email relay** over an in-house pipeline (no npm dep, no DB table, no Storage bucket, no domain verify) — matches "least effort, accept-the-risk" stance. New glossary term **Feedback** in CONTEXT.md (distinct from Nomination + the leksokipos `reports` slice).
2. **Relay pivot** — started on Web3Forms; its form-creation wizard 403s (API access is Pro) and email **attachments are Pro** on both Web3Forms and FormSubmit's AJAX endpoint doesn't take files → **screenshot deferred, text-only MVP** on **FormSubmit AJAX** (`formsubmit.co/ajax/<id>`, no account — first submit triggers a confirm email).
3. **`FeedbackModal`** (`components/shared/`) — reuses shared `Modal`; message required (≤1000); auto-attaches `page_url`/`user_agent`/`device_id`; POSTs FormData; success "Ευχαριστούμε!" + 2.5s auto-close; inline error retry; 60s localStorage throttle. Recipient via `NEXT_PUBLIC_FORMSUBMIT_ID` (email or hashed alias). 8 tests mirror `nominationModal.test.tsx`.
4. **Shell** — new "Βοήθεια" drawer section → "💬 Σχόλια / Πρόβλημα" opens the modal.
5. **Consolidation (user note)** — extracted the duplicated success-close button into `btnModalPrimary` recipe; applied to both FeedbackModal **and** NominationModal. Documented the env var in `.env.local.example`.
6. **Manual step remaining (user):** set `NEXT_PUBLIC_FORMSUBMIT_ID` (email/alias) in `.env.local` + Vercel env; confirm FormSubmit's activation email on first send.
7. **Follow-up parked:** screenshot attachment (needs a paid relay or Supabase Storage + in-house email).
8. **Gates:** 1251 pass / 6 skipped · eslint 0 · build 0.

---

## Session 62 — 2026-07-03: Consolidation-file consistency — `GameId`→`SliceId`, palette-token sweep + guard ✅
Review of the "single source of truth" files (`src/config/*`, `src/styles/recipes.ts`, game `types.ts`) for drift, then remediation. Concurrent with session 61 (profile epic) on the same tree; this is the "config/token consolidation" its note referenced. Uncommitted at session end.
1. **Config sources enforced** — `LEKSOKIPOS.MIN_WORD_LENGTH` was defined-but-unused (`4` hardcoded in `validation.ts` + `computeValidWords.ts`) → now imported. `LEKSIARXEIO.LENGTHS` replaces literal `[4,5,6,7,8]` in `validateSubmission`, `LeksiarxeioBoard`, `CommunityLeksiarxeioSubmitModal`, and the leksikastirio page. `LeksiarxeioLength` `3|4..8`→`4..8` (dead `3`; removing it surfaced + killed phantom `3:[]` rows in `data/leksiarxeio` WORD_LISTS/ANSWER_POOLS).
2. **`GameId`→`SliceId` rename** (`types/index.ts` + 3 hooks + README/memory) — it's the persistence-slice union (incl. `suggestions`/`reports`), NOT the game registry; misleading "all games" comment corrected to point at `RegistryGameId`.
3. **Palette sweep (ADR 0008)** — tokenised genuine neutral-chrome literals: GameBoard end-panel, NewPuzzleButton (+tooltip), ShareButton tooltip, leksokipos LeaderboardModal links, WordCard focus-ring, leksikastirio page, StavroleksoPlayer, LetterPickerModal (also killed a literal `active:bg-stone-100`). **Documented exceptions left as-is:** StavroleksoGrid, Shell drawer (`zinc`), FeedbackBanner (theme-prop), FlowerGridPlayground (dev tool), fixed-yellow chip.
4. **Enforcement + docs** — new `noRawPaletteClasses.test.ts` fails the build on any literal `stone/zinc/gray/slate/neutral` class in shipped `.tsx` (allowlist mirrors the ADR 0008 exceptions). Updated: CLAUDE.md standing rules (tokens + config-import), soul.md post-feature protocol (new step 5 consolidation check), ADR 0008 (exceptions + enforcement note), memory.md (config layer, `SliceId`, exceptions).
5. **Gates:** 1236 pass / 6 skipped · eslint 0 · build 0.

---

## Session 61 — 2026-07-03: Epic B — Profile Page + Trophy Case COMPLETE (slices 1–4, `/tdd`) ✅
Implemented the profile-page handoff slice by slice via `/tdd`; committed to `dev` (7 commits `e6b0daa`→`973ab31`). **Epic B done; only the manual pass + the detection epic remain.**
1. **Slice 1 (issue 02)** — `/profile` route (Shell-wrapped): display-only `IdentityHeader` (3 identity states, initial-letter avatar) + one-shot `WelcomeBackBanner` (consumes `signin-restore-welcome`) + `ProfileSection` reused verbatim. Callback now `restored:true → router.replace("/profile")` (still clears `auth-redirect`).
2. **Slice 2 (issue 03)** — three entry points: Shell header 👤 `Link`, home `ProfileChip` island (`useSyncExternalStore` — no hydration mismatch, no `set-state-in-effect`), `ProfileSection` "Δες το προφίλ σου →" funnel (opt-out `showProfileLink`, default true; page passes false).
3. **Slice 3 (issue 04)** — `GET /api/profile/stats` (edge, read-only, fetch-and-reduce, `Cache-Control: private, max-age=60`) + pure `src/lib/lifetimeStats.ts` `aggregateLifetimeStats` + `LifetimeStatsStrip` (skeleton / dash-on-error). **Τζιμάνι = leksokipos-only** (points & puzzles cross-game). Schema confirmed (`is_perfect` exists via migration `20260629000001`; `UNIQUE(game_id,device_id,puzzle_date)` → clean `COUNT(*)`).
4. **Slice 4 (issue 05)** — pure `src/games/leksokipos/lib/achievements.ts` catalog (5 one-shot + 2 tiered, per-tier frozen ids, **type-only** `AchievementPredicate` — no detection) + page-local `TrophyCase` grid (all locked/greyed, tier rows).
5. **Palette-token sweep (ADR 0008)** — tokenized the identity/profile UI (`ProfileSection` + callback; fixes pre-existing non-flipping darks: `text-stone-*→muted`, `hover:text-stone-600→foreground`, `text-red-*→danger`, confirm reds → `danger/10-40`). Left intentionally literal: Shell dark drawer `zinc-*`, `GoogleIcon` brand fills.
6. **Docs** — `manualTestingDevToMain.md` §2 (~15-min happy-path manual pass appended); `achievementsLeksokipos.md` absorbed the catalog canonical-location pointer (→ `achievements.ts`) + the per-badge detection table, and its "no profile page" reality-check marked resolved; **profile handoff deleted** (superseded). Issues 02–05 filed (delete after the manual pass). A concurrent agent's config/token consolidation shares the tree (its ~22 files uncommitted — not ours).
7. **Gates:** 1233 pass / 6 skipped · eslint 0 · build 0. **Manual verification pending** (no dev DB — `npm run dev` hits prod; use a fake name).

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 60 | 2026-07-03 | **Epic A COMPLETE** (migration pushed+verified, handoff deleted). Grill moved `identity_audit` to link-time (change-only rows, service-role, no FK to auth.users); hard `reloadApp()` on Disconnect (stale in-memory board state). Migration `20260703092500`. 1208 pass. |
| 59 | 2026-07-03 | Epic A slices 3+4: Disconnect unification (`disconnectIdentity()` full-reset — deviceId+name+flags+all game slices); visibility rule (`onSignIn` required, Google sign-in in ProfileLinked mode, wired into all 4 boards). Identity/achievements grill: device_uuid key, no-backfill, per-tier rows. 1198 pass. |
| 58 | 2026-07-03 | Profile Page grill → handoff ready-for-agent, zero code. Decisions table, catalog draft (§4), restore→/profile redirect. CONTEXT glossary: Profile Page/Trophy Case/Badge/Lifetime Stats. |
| 57 | 2026-07-02 | Sign-in Restore impl slices 1–2: JWT is identity source (401 guards, shared `getServiceRoleClient`); restore/merge via pure `planScoreMerge` (best score per puzzle); `adoptDeviceIdentity`. Fixed silent `device_uuid`→`device_id` backfill bug. 1194 pass. |
| 56 | 2026-07-02 | Sign-in Restore design grill → **ADR 0012** (auth = durable anchor, restore adopts DeviceId, Disconnect resets); ADR 0007 superseded-in-part; CONTEXT glossary + `docs/admin-restore.md` break-glass recipe. |
| 55 | 2026-07-02 | Test-suite audit: gap-fill + dup cleanup; soul.md rule "coverage never goes down"; consolidated gameLogic/greekLogic + mobileLayout; new vrestifrasi/useProfile/useLeaderboardProfile suites. 1174 pass. |
| 54 | 2026-07-02 | Architecture: 4 pure community-puzzle `validateSubmission` adapters (routes → config); Stavrolekso PATCH edit-hole closed; maker/server dedup. 1158 pass. |
| 53 | 2026-06-29 | UI consolidation (**ADR 0009**): per-game `--game-accent` token; shared `Modal` primitive (9 modals); recipes split (platform vs leksokipos); dead `lightTrigger` deleted. 1104 pass. |
| 52 | 2026-06-29 | Bug fix: leaderboard "back to today" link used `date<today`; now `date!==defaultPuzzleId` + distinct today label. 1115 pass. |
| 51 | 2026-06-28 | Bug fix: past-puzzle nav (`useDayChange` mount-redirect early return; `key={puzzle.id}` remount; `shouldSave` guard for empty state). 1113 pass. |
| 50 | 2026-06-28 | Architecture: `consumeApprovedPuzzle` lifecycle; shared `useGuessRound` spine; Leksokipos `sync.ts` seam (push+pull); folded `dateToIndex`. 1109 pass. |
| 49 | 2026-06-27 | Leksokipos UI polish (6): `btnHeaderIcon` recipe, smaller variant toggle, dice removed, copy-icon share, Greek feedback msgs, two-phase GiveUpModal. 984 pass. |
| 48 | 2026-06-27 | Fixed broken score cleanup (`upsertAndClean` used `void` not `await` → thenable never fired). New `cleanup-scores` GET route (CRON_SECRET, service role, >7d) + daily `vercel.json` cron. **Needs `SUPABASE_SERVICE_ROLE_KEY`+`CRON_SECRET` in Vercel env.** |
| 47 | 2026-06-27 | Rank rename (ψαράκι→Απολυτότητα, `RANKS` single source) + full design-token consolidation (**ADR 0008** CSS semantic tokens; all games/shared tokenized, 0 `dark:` in leksokipos); `platform.ts`. 972 pass. |
| 46 | 2026-06-24/26 | Wordlist proper-noun cleanup: 16,933 removals from `words-el.json` (812k→795k) via Hunspell capitalisation signal; applied + puzzles re-synced. 949 pass. |
| 45 | 2026-06-22 | Leksikastirio admin `max-w-6xl`; nomination re-proposal warning (`/api/nominations/lookup` + blur-check; rejected→mandatory note, pending→info); apply-nominations skill refreshed; 4 tests. |
| 44 | 2026-06-22 | Nomination apply pipeline: `scripts/lib/resync-puzzles.mjs` surgical `puzzles-el.json` re-sync in `apply-nominations.mjs`; `npm run apply-nominations[:dry]`; 13 tests. |
| 43 | 2026-06-22 | NYT brand scrub (comments/docs only; IDs frozen); pinch-zoom lock (`viewport` in `layout.tsx`); Leksokipos `useDayChange` auto-advance on stale-CDN day change. 932 pass. |
| 42 | 2026-05-30 | Google OAuth augments device identity: `useAuth`, `/auth/callback` PKCE, `/api/auth/link` edge route (upserts `auth_user_id`, back-fills), `authLinked` in envelope, `ProfileSection`+4 modals threaded, ADR 0007. |
| 41 | 2026-05-29 | Bug fixes: dark-mode FOUC on Leksokipos client nav; Stavrolekso server crash (self-`fetch`→direct Supabase); Turbopack edge warning documented. |
| 40 | 2026-05-28 | Vres Tin Frasi — 4th game: pure logic, community-first data loader, components, `/vres-tin-frasi`, platform wiring, Leksikastirio "Φράσεις" tab, tests. |
| 39 | 2026-05-28 | Bug fixes + Leksokipos game-state restore: word normalisation; scoreboard labels; FOUC script; `useGameStateSync` slimmed to `{foundWords}`; server-restore gating; ADR 0003. |
| 38 | 2026-05-27 | Community puzzles: review routes, async data loaders (community-first FIFO), submission modals, admin tabs in Leksikastirio. |
| 37 | 2026-05-27 | Dark mode: `@custom-variant dark`, `useTheme`, ☀️/🌙 toggle, dark variants across games/modals, ADR 0002. |
| 36 | 2026-05-27 | UI polish: compact ✓/✕ admin buttons; Greeklish "Leksikastirio"; Shell header + Παιχνίδια/Κοινότητα drawer split; Leksiarxeio white mode. |
| 35 | 2026-05-26 | Architecture: `useGameIdentity` (SSR-safe id init); `useScoreSubmission` extended to all games; per-game submission hooks deleted. |
| 34 | 2026-05-24 | FlowerGrid variant presets; `LeksokiposLayout` toggle persisted to `leksokipos-variant`; tests. |
| 33 | 2026-05-23 | Internal identifier rebranding to Greek names (hooks/components/types). Puzzle ID strings unchanged (localStorage compat). |
| 32 | 2026-05-23 | `FlowerGrid.tsx` — SVG flower grid; replaced `HoneycombGrid`. |
| 31 | 2026-05-22 | Platform rebrand: Spelling Bee→Leksokipos, Wordle GR→Leksiarxeio, Connections→Leksindeseis; Greek rank names; routes/components renamed. |
| 30 | 2026-05-22 | Connections leaderboard: `POST/GET /api/connections-scores`, hook, modal, board extracted. |
| 29 | 2026-05-22 | `postScore` + `upsertAndClean` shared libs; submission hook refactor. |
| 28 | 2026-05-22 | `useRoundPersistence` replaces 3 per-game persistence patterns. |
| 27 | 2026-05-22 | `CONTEXT.md` created; `Puzzle`→`SpellingBeePuzzle`; `getPrebuiltPuzzleByLetters`. |
| 26 | 2026-05-21 | `flex-1 aspect-square` tiles + per-length `max-w-*`; `WordleHeader` extracted; 🏆 in header. |
| 25 | 2026-05-21 | Vercel Fluid CPU mitigations: `validWordsCache`, ISR `revalidate=3600`, Edge runtime on all API routes. |
| 24 | 2026-05-20 | `isDailyPuzzle` + `isISODate` single-source; replaced 4 inline regexes. |
| 23 | 2026-05-20 | `useScoreSubmission` + submission hook; `useLeaderboard` `buildUrl` param. |
| 22 | 2026-05-20 | Spelling Bee Give-Up: confirm → locked game → missed words revealed; `givenUp` persisted. |
| 1–21 | 2026-05-12–19 | Foundation (shell, routing, persistence, types) · Leksiarxeio · Theming · Leksindeseis · Greeklish URLs · quality filter · suggestions · per-puzzle leaderboard + 7-day strip · mobile · no-accent invariant · `maxScore` cap. |

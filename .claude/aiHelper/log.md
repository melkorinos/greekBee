# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 71 — 2026-07-10: Prerender daily combos (`/tdd`) ✅
Implemented `HANDOFF-prerender-daily-combos.md` (Fluid CPU option #2 — remove daily-puzzle traffic from Fluid entirely).
1. **Slice ①**: pure `getPrebuiltPuzzleParams(language)` in `puzzleIndex.ts` (slim index → greeklish `{center, outer}` per puzzle). 4 tests in `puzzleIndex.test.ts`: 1008 pairs, lowercase greeklish shape, `parseCustomUrl` round-trip to file-order letters, **canonical under the page's own redirect comparison** (a non-canonical param would prerender a self-301ing page).
2. **Slice ②**: `generateStaticParams()` in `[center]/[outer]/page.tsx` delegating to it; `dynamicParams` default (true) + `revalidate=604800` kept for custom combos. New source-guard in `deploymentReadiness.test.ts` (export exists + sourced from slim index).
3. **Slice ③ verified**: route `ƒ`→`●` (SSG), **1008 HTML+RSC files** under `.next/server/app/leksokipos/`, today's (`a/stpolu`) on disk. **Build 17.7 s→16.7 s (no cost)**. Local prod smoke: redirect 307→today 200/8 ms; custom cold 1.12 s/warm 3 ms; encoded-Greek 307→canonical. Re-measure verdict in `fluid-cpu/analysis.md`: latency harness N/A — real "after" = Vercel Functions dashboard 2–3 days post-merge.
4. No perf-test addition: `getPrebuiltPuzzleParams` is build-time-only (not a request hotpath). Gates: **1413 pass / 6 skip · eslint 0 · build 0**. **Browser play-through on today's daily = remaining manual step before dev→main merge** (handoff mandate).
5. Per user: deleted `HANDOFF-prerender-daily-combos.md` (done) AND `fluid-cpu/HANDOFF-fixes-1-2.md` — **items 1 (word-list SSR payload) + 2 (consume-per-view correctness bug) remain unimplemented**; verdicts live in `fluid-cpu/analysis.md`, full handoff recoverable from git history.
6. New `fluid-cpu/HANDOFF-post-deploy-readout.md`: measure ~1 week post-merge (Functions-by-CPU, gauge min/day vs 10, confounds incl. billing reset) → append read-out to analysis.md, then delete it. **Fill in merge commit/date at merge time.**

---

## Session 70 — 2026-07-08: Fluid CPU read-out + lazy-load words-el (`/tdd`) ✅
1. **Post-deploy read-out** (fixes 3+4, appended to `fluid-cpu/analysis.md`): gauge 2h31m→3h1m in 3 days ≈ **10 min/day** (~20% lower); zero runtime errors 7d. Dashboard Functions-by-CPU: `[center]/[outer]` **44 inv / 1m ≈ 1.4 s each** = dominant burner (the 23.5 MB parse); `/leksokipos` redirect now 57 ms/inv (fix 3 verified). **Headroom: 59 min of 4h cap** → ~Jul 14 at current rate; user weighing Pro upgrade — option table delivered (lazy-load > prerender > ISR-claim > SSR-payload > api-cache).
2. **Lazy-load shipped**: `buildCustomPuzzle` now **async**, `words-el.json` via `await import()` inside the cache-miss branch only; static import removed from `src/data/leksokipos/index.ts`; page awaits. Daily renders parse only puzzles-el (4 MB). New **Fluid CPU guard** in `deploymentReadiness.test.ts` (source-level: no static words-el import + dynamic import() present). Test callers migrated async; 60 s warm-up `beforeAll` in customPuzzle + noAccents (first import() pays the 19.5 MB parse — timed out at defaults).
3. **Verified**: words-el is its own 19.9 MB chunk, referenced only via turbopack async loader (page bundles words-el-free). Local prod smoke: daily redirect 200/95 ms (no word list), custom cold 0.94 s, warm 11 ms. Gates: 1407 pass / 6 skip · eslint 0 · build 0.
4. Next lever handed off: **prerender daily combos** → `.claude/handoffs/HANDOFF-prerender-daily-combos.md` (TDD + pre-push smoke mandate).

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 69 | 2026-07-07 | **Achievements B2 — pangram tier** (`/tdd`): `player_pangrams` append-only find-SET (ADR 0013 data-class 3; migration `20260706120000`, **`db push` was PENDING**); `POST /api/pangrams` insert-if-absent + shape guards (`sanitizePangramWords`); `detectEarnedPangramTiers` (generic tier core); 3rd `useAchievementSync` lane + self-heal on the ONE stats fetch; `pangram_count` on `/api/profile/stats`; `planPangramMerge` in restore; TrophyCase generalized; cleanup-scores regression-locked. Manual prod verification was pending. 1403 pass. |
| 68 | 2026-07-06 | B2 pangram-tier handoff code-verification review: all claims accurate; fixed R6 contradiction (per-word delta-posting, not per-session), scoped risk #8 honestly (self-heal ≠ cross-day), added R2 input guards (`isISODate`+normalize+shape regex+cap), self-heal rides the ONE `/api/profile/stats` fetch. No product code. |
| 66 | 2026-07-06 | **Achievements B1** (`/tdd`): points tier (Συλλέκτης Πόντων) + unlock toast + TrophyCase progress on the *safe* badge (no migration/merge). `leksokipos_points` on `aggregateLifetimeStats`; `useAchievementSync` points+toast lanes (earned-at-mount suppression); `AchievementToast`; ADR 0013 "B1 resolutions". 1354 pass. |
| 65 | 2026-07-05 | Fixed `game_scores` prune contradicting ADR 0012 append-forever (issue 03): cron never deletes `game_scores`; `SCORE_RETENTION_DAYS`→`SESSION_RETENTION_DAYS`; stats query window-filter regression-locked. Issue 03 deleted. 1291 pass. |
| 64 | 2026-07-05 | Fluid CPU: `/leksokipos` puzzle-index (route chunk 22MB→0.2MB) + `[center]/[outer]` ISR 3600→604800; measured Leksiarxeio/Frasi 2.4MB/view; `consumeApprovedPuzzle`-per-view bug + payload items 1+2 handed off. 1274 pass. |
| 63 | 2026-07-04 | **Feedback feature** (grill→/tdd): form-to-email relay (no dep/table/bucket), text-only MVP on **FormSubmit AJAX** (`formsubmit.co/ajax/<id>`); `FeedbackModal` (shared `Modal`, ≤1000, auto-attach page/UA/device, 60s throttle) via Shell "Βοήθεια"; `btnModalPrimary` recipe extracted; env `NEXT_PUBLIC_FORMSUBMIT_ID`. New CONTEXT glossary term **Feedback**. Screenshot parked. 1251 pass. |
| 62 | 2026-07-03 | **Consolidation-file consistency**: enforced config sources (`LEKSOKIPOS.MIN_WORD_LENGTH`, `LEKSIARXEIO.LENGTHS`; `LeksiarxeioLength` 3→dead removed); `GameId`→`SliceId` rename (persistence-slice union, not registry); ADR 0008 palette sweep + new `noRawPaletteClasses.test.ts` guard (allowlist = documented exceptions). 1236 pass. |
| 61 | 2026-07-03 | **Epic B — Profile Page + Trophy Case COMPLETE** (`/tdd`, 7 commits `e6b0daa`→`973ab31`): `/profile` route (`IdentityHeader`+`WelcomeBackBanner`+`ProfileSection`); 3 entry points (Shell 👤, home `ProfileChip` island, funnel link); `GET /api/profile/stats` + pure `aggregateLifetimeStats` + `LifetimeStatsStrip`; page-local `TrophyCase` (catalog in `achievements.ts`, all locked). Τζιμάνι = leksokipos-only. 1233 pass. |
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

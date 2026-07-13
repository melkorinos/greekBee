# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 74 — 2026-07-13: Λεξοδρομία — new game built (`/tdd`) ✅
Implemented `HANDOFF-namepending-game.md` end-to-end (handoff deleted). **Name chosen by user: Λεξοδρομία, permanent id `leksodromia`** (dirs/route/slice/`LEKSODROMIA` config block). 7 red→green slices:
1. **Pure lib** (`src/games/leksodromia/lib/`): `computeWordPoints` (decay-to-floor, hint −30% BASE, MIN_SOLVED_POINTS clamp, perfect round === MAX_SCORE 1000); `selectDailyWords(date, pools)` (pools injected — the loader binds them; seeded mulberry32/FNV-1a in `seededRandom.ts`; **never picks Leksiarxeio's same-day fallback answer** — fixture-pool + 365-real-date tests); `scrambleWord` (seeded Fisher-Yates, multiset-true, never identity, rotate-by-1 fallback).
2. **Reducer** — tile-index input model (`picked`), hints lock an answer-prefix of tiles (`lockedTileIdxs`) and clear free picks, `RESTORE_STATE` re-locks prefix from `currentHintsUsed`; selectors `getCurrentInput/getAvailableTileIndices/getTotalScore`. Reducer never reads Date.now() — elapsed arrives as SUBMIT/SKIP payload.
3. **Hooks** — `useElapsedClock` (accumulates only while running+visible, `getElapsedMs()` exact, `reset(base)`); `useLeksodromiaRound` (reducer+clock+`useRoundPersistence`; snapshot `{puzzleId, wordIndex, currentElapsedMs (1 s-coarsened writes), currentHintsUsed, results}`; **refresh restores the decay clock**; skip-flag distinguishes restore from word-advance clock reset; shouldSave blocks pristine writes).
4. **Components** (`src/components/leksodromia/`): Board (rack→answer row, live decaying counter, hint w/ cost, two-phase skip, FeedbackBanner wrong-submit, recap, **score posts once on LIVE finish only** — `userActedRef` guards restored-finished rounds), PageClient (HowToPlay pauses clock via `paused` prop), HowToPlayModal (copy derives from `LEKSODROMIA`), RoundRecap, LeaderboardModal (thin `LeaderboardModalBase` wrapper, desc sort).
5. **Wiring** — `src/data/leksodromia/` static-imports `answers-{4..8}.json` DIRECTLY (~300 KB; **not** via `@/data/leksiarxeio`, whose graph pulls the MB-scale `words-*.json` — Fluid CPU); `force-dynamic` route; registry entry `wip: true`; `--game-accent` red-600; `SliceId`+envelope+`useScoreSubmission` unions extended; picker `GAME_RULES` entry; `deploymentReadiness` list += answers-{4..8}.
6. No perf-test addition: selection/scramble are O(10) index math — no >10k scans on the request path.
7. Gates: **1487 pass / 6 skip · eslint 0 · build 0** (was 1413). Remaining before `wip: false`: polish pass + manual browser play-through. *(Ran concurrently with session 73's Leksoplegma grill — log/handoff dirs were shared; reconciled here.)*

---

## Session 73 — 2026-07-13: Leksoplegma design grill → handoff (zero code) ✅
Grilled a zanagrams.com-inspired word-web game; handoff ready for `/tdd`: `.claude/handoffs/HANDOFF-leksoplegma-game.md`. Reverse-engineered the original from its own source (site 403s bots; curl+browser-UA got `i18n.js` + real puzzle JSONs — 16-tile graph, authored `paths` per required word, bonus words, collapse rule). **Name FINAL: leksoplegma** (grilled — dirs/routes never rename).
1. **Grill decisions (user):** offline generator script → committed `puzzles-el.json` batch + `dateToIndex` rotation; **no timer — Leksokipos-style points** (length×10 required, flat 25 bonus, hint −25, is_perfect = 0 hints); single daily ~9 words.
2. **Initiative decisions logged in handoff:** collapse = drop tiles/edges unneeded by remaining required words; bonus words precomputed offline vs words-el (never shipped); end = last required word; drag+tap both feed pure `TRACE_WORD`; generator constraints (full tile coverage, no crossing diagonals); Leksiarxeio same-day answer guard at loader; no definitions MVP; `wip: true`.
3. Note: Leksodromia (session 72's game) is mid-build in the working tree — Leksoplegma is a **second, separate** new game.

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 72 | 2026-07-13 | **Anagram-sprint design grill → handoff** (became Λεξοδρομία, built in session 74): decay-to-floor scoring, 2× lengths 4–8 from Leksiarxeio answer pools, exact-match MVP, refresh-proof clock, leaderboard at launch (`game_scores.game_id` unconstrained — no migration). Name-first blocker recorded. |
| 71 | 2026-07-10 | **Prerender daily combos** (Fluid #2): `getPrebuiltPuzzleParams` (slim index, canonical-param contract) + `generateStaticParams` on `[center]/[outer]` → route `ƒ`→`●`, 1008 pages SSG, custom combos keep ISR 604800. Deleted done+superseded fluid handoffs (**payload item 1 + consume-per-view bug 2 still unimplemented**; verdicts in `fluid-cpu/analysis.md`). New `fluid-cpu/HANDOFF-post-deploy-readout.md` (~1 wk post-merge; fill merge commit at merge). **Manual browser play-through required before dev→main merge.** 1413 pass. |
| 70 | 2026-07-08 | Fluid CPU read-out (gauge ≈10 min/day, `[center]/[outer]` 1.4 s/inv dominant) + **lazy-load words-el**: `buildCustomPuzzle` async `await import()` on cache-miss only, static import removed, Fluid CPU source-guard in `deploymentReadiness.test.ts`; words-el its own 19.9 MB async chunk. Prerender lever handed off. 1407 pass. |
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

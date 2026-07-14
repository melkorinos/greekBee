# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 78 — 2026-07-14: Λεξόπλεγμα extra words reinstated + soft collapse (prod-prep grill)
`/grill-with-docs` on leaderboards/prod-readiness → found **leaderboards already done** (verify-only) and no pre-generation needed (Λεξοδρομία derives daily words; Λεξόπλεγμα has the 200-puzzle batch, wraps mod 200). Mid-grill `/diagnosing-bugs`: user's "counter stuck at 0/9, score moves" on λογοσ/μαγοσ/γομα → **not a code bug** — all three are `bonusWords` on `leksoplegma-160` (stale localhost build still had the HEAD bonus mechanic; repro test vs real data proved all 9 required words accepted both directions). User then chose to **reinstate extras (Option 1)**:
1. **Extras count again**: any `bonusWords` member traced either direction → `foundBonus`, flat +25 (`computeScore(required, bonus, hints)` restored); never gates completion; 9/9 required still ends the round.
2. **Soft collapse** (replaces hard): traces validate vs the FULL authored web (`edgesOf(paths)`); `liveTiles/liveEdges` now drive bright-vs-dim styling only — Grid renders web tiles/edges always (dim = `opacity-40`/`opacity-30`, still interactive). No more grab-before-collapse race (why bonus was cut in s77).
3. **Auto-submit stays REQUIRED-only** (extras like λογο are prefixes of λογουσ — auto-submitting would block the longer word); new ✓ button (`Καταχώρηση`) submits tap-built extras; drag-release unchanged. Board: «Έξτρα n» counter + chips; Recap: extras section; HowToPlay + home blurb updated («θαμπώνουν», ✓ for extras).
4. Hook persists/restores `foundBonus` (guards old bonus-less snapshots). Tests: extras suite incl. **soft-collapse regression** (extra accepted after both its edges dimmed), reverse extra, dup, score post 105, restore.
5. CONTEXT.md: both new games fully glossed (Trace/Collapse-soft/**Extra Word**/Decay Scoring/Scramble/Skip/Hints **engine-only at launch** — no UI button dispatches USE_HINT in either game, so every Λεξόπλεγμα finish posts `is_perfect: true`); Game/Puzzle/Puzzle ID/game_scores rows updated.
6. Prod-readiness state: play-through done by user (pre-rework), gates green pre-rework (1561); **rework needs fresh local verify by user + gates** before commit → dev→main. Leksindeseis `wip: true` is longstanding (since registry creation), not a regression — user decision pending.

---

## Session 77 — 2026-07-14: Λεξόπλεγμα + Λεξοδρομία polish (user QA pass)
Direct user requests on the two wip games. Gates: test/eslint/build all green.
1. **Λεξόπλεγμα counter bug** — "Λέξεις 0/9 doesn't increment when a word is found." Root cause: traces walk **undirected** edges, so drawing a word end→start spelled it reversed and never matched → stayed a "wrong" trace. Fix: TRACE_WORD (reducer) + `completesWord` (board) now accept the word **either direction** (`forward` or reversed). Regression tests added (reducer `[2,1,0]`→αβγ; board tap-builds "γβα").
2. **Removed the bonus-word (Έξτρα λέξεις) "time element"** per user — the grab-before-collapse race. Cut `foundBonus` from state/reducer/scoring(`computeScore(required, hints)`)/hook snapshot/board counter/recap/help + home-page blurb. `bonusWords` stays on the puzzle type + JSON as **offline-only** generator data (untouched). Collapse rule kept (required-word cleanup, not a timer).
3. **Found-words list** now labelled "Βρήκες" and shown as chips (was already there but masked by bug 1).
4. **Λεξοδρομία**: removed ⌫ button — **tapping the answer row** now removes the most recent letter (div+onClick, Modal-overlay a11y pattern). Scrambled rack → **two rows**, top row keeps the extra tile on odd counts (`ceil`/`floor`, e.g. 3+2). Skip button **Παράλειψη → Επόμενο** (label + aria + help + home blurb; two-phase confirm kept).
5. Tests updated (leksoplegma reducer/scoring/board; leksodromia board incl. new tap-to-remove test).
6. **Both graduated wip:true → false** after user confirmed play-through — `GAME_REGISTRY` flags flipped (picker + Shell auto-move them out of "🚧 Υπό κατασκευή"; only Leksindeseis stays wip). Platform now **7 live games**. memory.md status table updated.

---

## Session 76 — 2026-07-14: Fluid CPU prerender read-out — VERDICT: FIXED ✅ (investigation closed)
Executed `fluid-cpu/HANDOFF-post-deploy-readout.md` (deleted); full verdict in `fluid-cpu/analysis.md`. No product code.
1. **Deploy pinned:** merge `d64e651` → prod `dpl_2VsGBZEufrejhKYR4QqrAXVyijz3` 2026-07-11 10:11 UTC. Build logs: `● [center]/[outer]` **1008 paths** (1018 static in 8.9 s), build 58 s.
2. **All 3 success criteria met (day 3):** `[center]/[outer]` **44 inv/60 s → 1 inv/2.39 s** (the 1 likely our own probe); total function CPU ≈ 99 s/window ≈ **0.6 min/day vs 10 min/day baseline**; daily combo = CDN HIT + `X-Nextjs-Prerender: 1`, custom combo MISS→ISR once; zero errors, zero Node-lambda traffic in live sample. Top CPU now the edge APIs (game-scores/game-state/achievements, ~190 ms/inv).
3. **Confound:** Vercel **Pro upgrade 2026-07-14** — gauge now in $ (`$0.02` ≈ 9 CPU-min), $20/mo included, $200 cap; compared daily rates not totals. Items 1+2 stay UX/correctness-only (7 s + 6 s/window is noise).
4. **Tooling:** Vercel MCP absent this session → fell back to Vercel CLI (device login `melkorinos`); `/project-mcp` skill updated: Pro plan row + "MCP absent? use CLI" section (`vercel ls/inspect/logs` recipes; `inspect --logs` writes to **stderr**; `logs` live-streams only; per-function CPU stays dashboard-only).

---

## Session 75 — 2026-07-14: Λεξόπλεγμα — new game built (`/tdd`) ✅
Implemented `HANDOFF-leksoplegma-game.md` end-to-end (handoff deleted); zanagrams-style word-web, **no timer — points only**. 7 red→green slices:
1. **Pure lib** (`src/games/leksoplegma/lib/`): `graph.ts` (undirected `edgeKey`/`edgesOf`, collapse rule as derived state `liveTiles/liveEdges(paths, foundRequired)`, `isTraceValid` — grid-agnostic, adjacency is a generator concern); `scoring.ts` (`computeScore` = Σ len×10 + 25/bonus − 25/hint, floor 0; `isPerfectRound` = 0 hints). `LEKSOPLEGMA` block added to `gameRules.ts`.
2. **Reducer** — single `TRACE_WORD` seam for both control schemes (drag + tap): validates trace vs live edges, routes required/bonus/miss-dup(shake); `USE_HINT` auto-targets first unfound un-hinted word (per-word cap 1, reveals start tile + length via `getActiveHints`); `RESTORE_STATE` filters to puzzle words. Collapsed-bonus = deliberate "grab before finishing" tension (regression-locked).
3. **Generator core in game lib** (`lib/generator.ts`, offline-only, dict/pools injected — deviation from handoff's `.mjs`: TS core imports config, thin `tsx` CLI `scripts/generate-leksoplegma.ts`, `npm run generate-leksoplegma`): randomized DFS placement w/ free-tile wildcards, full coverage + no-crossing-diagonals + long-anchor constraints, board re-rolls, prefix-pruned bonus enumeration vs words-el (**BONUS_MIN_LENGTH 3**, initiative), `validatePuzzle` gate. Committed batch: **200 puzzles, 193 KB**, avg base ≈454, bonus 14–115/puzzle. Deterministic per seed.
4. **Loader** (`src/data/leksoplegma/`): `dateToIndex` rotation + guard `containsSameDayLeksiarxeioAnswer` (advance index while any REQUIRED word == a same-day Leksiarxeio fallback answer, any length; bonus words excluded — they don't get revealed). 365-date leak test. answers-{4..8} imported directly (not via @/data/leksiarxeio — Fluid CPU).
5. **Hook** `useLeksoplegmaRound` — reducer + `useRoundPersistence` `{puzzleId, foundRequired, foundBonus, hintsUsed, status}`; no clock anywhere.
6. **Components** (`src/components/leksoplegma/`): Grid (SVG live-edge lines under 4×4 tiles, token strokes `stroke-[color:var(--color-border)]`/game-accent — no allowlist change needed; drag via elementFromPoint + tap-to-build feeding one trace), Board (trace state + word chip, hint chips, bonus counter, found list, recap, **score posts once on LIVE finish, is_perfect = 0 hints**), HowToPlay/Recap/LeaderboardModal (desc sort), PageClient.
7. **Wiring** — route `force-dynamic` + `data-game`; registry `wip: true` (🕸️); picker rules; `--game-accent` teal-600; `SliceId`+envelope+`useScoreSubmission` unions; deploymentReadiness += leksoplegma/puzzles-el.json. JSON cast note: heterogeneous `paths` keys need `as unknown as LeksoplegmaPuzzle[]`.
8. Gates: **1560 pass / 6 skip · eslint 0 · build 0** (was 1487). Dev-server smoke: /leksoplegma 200, 16 tiles SSR. Remaining before `wip: false`: polish pass + **manual browser play-through (drag-trace feel is untested by design — first pointer-drag game)**.

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 74 | 2026-07-13 | **Λεξοδρομία built** (`/tdd`, 7 slices): decay-to-floor scoring + seeded daily selection (never Leksiarxeio's same-day answer) + seeded scramble; tile-index reducer w/ hint prefix-locking; refresh-proof decay clock (`useElapsedClock`, 1 s-coarsened persist); Board/PageClient/recap/leaderboard; direct `answers-{4..8}` imports (Fluid-safe); registry `wip: true`, accent red-600. 1487 pass. |
| 73 | 2026-07-13 | **Leksoplegma design grill → handoff** (built in session 75): reverse-engineered zanagrams.com from source (16-tile graph, authored paths, bonus words, collapse rule); decisions: offline generator batch + rotation, no timer/points-only, ~9 required words, name FINAL leksoplegma. |
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

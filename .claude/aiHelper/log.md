# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 69 — 2026-07-07: Achievements B2 — pangram tier (`/tdd`) ✅
Built Κυνηγός Πανγκράμ on the B1 UX spine. **Data-class 3** (ADR 0013): an append-only find-SET whose *size* is progress, never a counter — retry-/merge-safe by construction. Uncommitted at session end.
1. **New table `player_pangrams`** (migration `20260706120000`) — `UNIQUE(device_uuid, puzzle_date, word)`, open RLS, append-forever; mirrors `player_achievements`. **`db push` still PENDING** (shared prod DB — awaiting user go-ahead; all tests mock Supabase so none needed it).
2. **`POST /api/pangrams`** — insert-if-absent, returns fresh lifetime `{count}` (server zero-detection). No id whitelist possible → junk bounded by shape: pure `sanitizePangramWords` (`normalizeLetters` → `^[α-ω]{7,24}$` → dedupe → 50 cap) + `isISODate` guard.
3. **Detection** — pure `detectEarnedPangramTiers` + `nextPangramTierThreshold` (extracted a generic tier core; the points fns are now thin wrappers). 3rd lane in `useAchievementSync` delta-posts new pangrams (per-word ref) + reads the crossing off the returned count (no lag); mount self-heal rides the ONE stats fetch (`fetchLeksokiposPoints`→`fetchLifetimeStats {leksokipos_points, pangram_count}`, +`postPangrams`). `GameBoard` passes memoized `foundPangrams`+`puzzleDate`. `commitEarned`/`flushToasts`→`useCallback` (lint-clean).
4. **`pangram_count`** on `/api/profile/stats` (parallel `COUNT(*)` via `Promise.all`; NOT in `aggregateLifetimeStats` — separate table). **Restore merge** — pure `planPangramMerge` keyed `(puzzle_date, word)`, wired into `restore()` beside the achievement merge; two devices union, occupied-device guard leaves it untouched.
5. **TrophyCase** generalized — each tiered badge reads its own live value (`points`/`pangrams`), generic `nextTierThreshold`, progress testid `tier-progress-<id>`. **cleanup-scores** regression-locked (never sweeps `player_pangrams`/`player_achievements`). ADR 0013 "B2 resolutions" + CONTEXT.md rows for BOTH fact tables (`player_achievements` was an undocumented B1 gap).
6. **Gates:** 1403 pass / 6 skipped · eslint 0 · build 0. **Manual verification pending** (prod DB — use a throwaway `device_uuid`, delete its rows after; lanes gated `!isGodMode` so god mode can't exercise them).

---

## Session 68 — 2026-07-06: B2 pangram-tier handoff — critical code-verification review ✅
Verified every claim in `achievements-B2-pangram-tier.md` against live code (B1 spine, `describeAchievement` tier coverage, `ALL_ACHIEVEMENT_IDS` whitelist, `restore()` merge block, cleanup delete-set, migration to mirror) — all accurate. Refined the handoff in place, no product code touched:
1. **R6 contradiction fixed** — "post once per session" would reintroduce the lag R3 claims not to have; rewritten as per-word delta-posting reactive to `foundWords` (+ `useMemo` trap noted).
2. **Risk #8 scoped honestly** — self-heal only covers same-puzzle remounts; a POST lost past day-rollover is a permanent (bounded, accepted) set undercount.
3. **R2 input guards added** — no whitelist possible for arbitrary words on an append-forever open-RLS table: `isISODate`, `normalizeLetters` before insert (UNIQUE text key), pangram-shape regex, array cap.
4. **One stats fetch** — self-heal must ride the points lane's existing `/api/profile/stats` read (`fetchLeksokiposPoints` → `fetchLifetimeStats`); build order tightened (generic tier-fn core suggested, `aggregateLifetimeStats` NOT the home for `pangram_count`, prod-DB manual-verification caveat). Still 🟢 ready for `/tdd`.

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
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

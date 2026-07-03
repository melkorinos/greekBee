# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

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

## Session 60 — 2026-07-03: Slice 3 follow-up + slice 5 — grill moved `identity_audit` to link-time ✅
`/grill-with-docs` on the identity handoff, then implemented test-first. **Epic A COMPLETE:** migration pushed to prod (user-OK'd) and verified via MCP; handoff **deleted** (durable records: ADR 0012, CONTEXT.md, `docs/admin-restore.md`, issue 01). Manual verification deferred to `.claude/handoffs/manualTestingDevToMain.md` §1 (new cumulative pre-merge checklist — future epics append their own sections).
1. **Grill findings (code contradicted docs)** — Disconnect is local-only, so `player_profiles` keeps the auth mapping and a sign-out-time audit row would be redundant; the events that actually destroy the email→device hop are **link-time** (`/api/auth/link` upsert overwrites another account's `auth_user_id` on a shared device; restore branch merges + deletes the old profile row). User-approved: audit moved to link-time server-side (service role, no client RLS policy needed), **change-only** rows, sign-out write dropped. ADR 0012 residual-gap bullet corrected; **issue 01 filed** (shared-computer overwrite prevention — deferred, own grill).
2. **Slice 3 follow-up — hard reload on Disconnect (user-approved)** — stale deviceId was half the leak: mounted boards keep old session state in React memory. New `src/lib/reload.ts` `reloadApp()`; `useAuth.signOut()` + `useProfile.disconnect()` call it after the envelope reset. Tests assert call + ordering (reset before reload).
3. **Slice 5 — `identity_audit`** — route: step-5 select gains `auth_user_id`; append `{auth_user_id, device_uuid}` only when the established pair differs from the row's prior mapping (first link / overwrite; restore + repeat sign-in write nothing); non-fatal on failure. Migration `20260703092500_add_identity_audit.sql`: `id` identity PK, `auth_user_id uuid`, `device_uuid text`, `at timestamptz default now()`; **RLS on, zero policies** (service-role only); **no FK to auth.users** (rows must survive account deletion); index on `auth_user_id`; append-forever. +5 route tests. Docs: `admin-restore.md` audit-history query; CONTEXT.md 11 tables.
4. **Gates:** 1208 pass / 6 skipped · eslint 0 · build 0.

---

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
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

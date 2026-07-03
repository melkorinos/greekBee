# Agent Log — Greek Word Games Platform

> Newest-first. Full detail for the two most recent sessions; older entries condensed below.
> **Rule:** keep this file under 150 lines — condense before adding new entries.

---

## Session 60 — 2026-07-03: Slice 3 follow-up + slice 5 — grill moved `identity_audit` to link-time ✅
`/grill-with-docs` on the identity handoff, then implemented test-first. **Epic A COMPLETE:** migration pushed to prod (user-OK'd) and verified via MCP; handoff **deleted** (durable records: ADR 0012, CONTEXT.md, `docs/admin-restore.md`, issue 01). Manual verification deferred to `.claude/handoffs/manualTestingDevToMain.md` §1 (new cumulative pre-merge checklist — future epics append their own sections). Uncommitted at session end.
1. **Grill findings (code contradicted docs)** — Disconnect is local-only, so `player_profiles` keeps the auth mapping and a sign-out-time audit row would be redundant; the events that actually destroy the email→device hop are **link-time** (`/api/auth/link` upsert overwrites another account's `auth_user_id` on a shared device; restore branch merges + deletes the old profile row). User-approved: audit moved to link-time server-side (service role, no client RLS policy needed), **change-only** rows, sign-out write dropped. ADR 0012 residual-gap bullet corrected; **issue 01 filed** (shared-computer overwrite prevention — deferred, own grill).
2. **Slice 3 follow-up — hard reload on Disconnect (user-approved)** — stale deviceId was half the leak: mounted boards keep old session state in React memory. New `src/lib/reload.ts` `reloadApp()`; `useAuth.signOut()` + `useProfile.disconnect()` call it after the envelope reset. Tests assert call + ordering (reset before reload).
3. **Slice 5 — `identity_audit`** — route: step-5 select gains `auth_user_id`; append `{auth_user_id, device_uuid}` only when the established pair differs from the row's prior mapping (first link / overwrite; restore + repeat sign-in write nothing); non-fatal on failure. Migration `20260703092500_add_identity_audit.sql`: `id` identity PK, `auth_user_id uuid`, `device_uuid text`, `at timestamptz default now()`; **RLS on, zero policies** (service-role only); **no FK to auth.users** (rows must survive account deletion); index on `auth_user_id`; append-forever. +5 route tests. Docs: `admin-restore.md` audit-history query; CONTEXT.md 11 tables.
4. **Gates:** 1208 pass / 6 skipped · eslint 0 · build 0.

---

## Session 59 — 2026-07-03: Slices 3+4 impl + identity/achievements grill ✅
0. **Slice 3 — Disconnect unification (ADR 0012 §5), `/tdd`** — user pre-decision **full reset**. New store fn `disconnectIdentity()` (renamed from `disconnectProfile`) writes `{deviceId: randomUUID()}` → wipes displayName + profileLinked + authLinked + **all game slices** (one envelope). `useProfile.disconnect()` calls it + `onDisplayNameChange("")`; `useAuth.signOut()` calls it too (Google sign-out **is** a Disconnect). Tests flipped/added in useGameStore/useProfile/useAuth. ⚠️ **Known follow-up:** Google sign-out path doesn't propagate the fresh deviceId into `useGameIdentity` React state (stale until remount) — decide reload-vs-callback when Epic B wires the profile disconnect button. Committed this session. Only slice 5 (`identity_audit`) left in Epic A.
1. **Slice 4 — visibility rule (ADR 0012), `/tdd`** — `onSignIn` now **required** in `LeaderboardProfileProps` + `ProfileSectionProps` (compile-enforced, no modal can silently drop sign-in); `ProfileSection` offers Σύνδεση με Google in **linked** mode too (ProfileLinked→Google upgrade path), not just idle; wired `useAuth` into all four in-game Boards (`GameBoard`/`Leksiarxeio`/`Connections`/`VresTinFrasi` — previously only `HomeTrophyButton`). New `src/test/shared/profileSectionSignIn.test.tsx` (4); `GameBoard.test.tsx` stubs `useAuth`. **1198 pass · eslint 0 · build 0.**
2. **Grill decisions (user-approved), docs updated** — identity key = `device_uuid` everywhere (never `auth_user_id`); Badge/Trophy Case/Streak ratified into CONTEXT.md (Streak folded into Lifetime Stats); detection = piggyback `pushFoundWords`, no per-word endpoint; **no backfill — hard reset at launch** (all counters/unlocks start at zero); data model = `player_achievements` one immutable row **per tier** (frozen IDs `-chalkino/-asimenio/-chryso`) + `player_stats.pangrams_found` + lifetime points derived on read; unlock = lightweight toast (no confetti dep); slice 5 `identity_audit(auth_user_id, device_uuid, at)` written on Disconnect when AuthLinked. Catalog canonical in `profilePageAndAchievements.md §4`.
3. **Still open** — slice 3 Disconnect wipe-granularity (deferred; keystone blocker for slice 5 + profile disconnect button).

---

## Session 58 — 2026-07-03: Profile Page grill — handoff ready-for-agent, zero code ✅
`/grill-with-docs` on `.claude/handoffs/profilePageAndAchievements.md`; all design questions resolved (AskUserQuestion), **nothing implemented**.
1. **Decisions (all user-approved)** — hybrid controls (new display-only identity header + reuse `ProfileSection` verbatim); leaderboard-modal profile coexists untouched (+ "Δες το προφίλ σου →" link); stats key = `device_uuid` (merge repoints rows, per ADR 0012/glossary); trophy case v1 = **real catalog all locked** (7 Leksokipos achievements drafted with Greek names + frozen-on-ship IDs); lifetime stats v1 = cheap real aggregates (total points, puzzles played, Τζιμάνι count — **no streaks**); **public profiles deferred** (DeviceId = secret credential, never in URLs); callback **redirects to `/profile` on `restored:true`** (welcome banner lands on proof); initial-letter avatar disc; no settings section.
2. **Verified in code** — OAuth round-trip returns to origin path (`supabase.ts` + callback); custom puzzles never post scores (`useScoreSubmission` `enabled:false`) so stats need no filter.
3. **Docs** — CONTEXT.md glossary: +Profile Page, +Trophy Case, +Badge, +Lifetime Stats; DeviceId (secret credential), Achievement (tier clause), Sign-in Restore (lands on Profile Page) amended. Handoff rewritten with decisions table, catalog draft (§4, user may still rename before IDs freeze), 5 slices for `/to-issues`.
No tests/build run — docs-only session. Parallel identity session owns slices 3–5; page inherits its Disconnect semantics.

---

## Session 57 — 2026-07-02: Sign-in Restore impl — Slices 1–2 (security boundary + restore/merge) ✅
Implementing ADR 0012 per handoff, `/tdd`, slice by slice. **Slices 1–2 done.**
1. **Slice 1 — JWT is the identity source** — `/api/auth/link` derives `auth_user_id` (+ Google name) from the verified Supabase JWT: reads `Authorization: Bearer`, `getSupabaseClient().auth.getUser(token)`, 401s on missing/invalid. Body carries only `device_uuid`. Closes account-squatting (body `auth_user_id` was trusted). Privileged writes via new shared `getServiceRoleClient()` in `src/lib/supabase.ts` (folded the `cleanup-scores` duplicate). **Latent bug fixed**: back-fill filtered `game_scores.device_uuid` (nonexistent col; table uses `device_id`) so it always errored silently → no score was ever stamped. Now `device_id`.
2. **Slice 2 — Sign-in Restore** — `/api/auth/link` is restore-aware: anchor lookup by `auth_user_id`; if the account already lives on another device, `restore()` merges this device's scores into it and returns `{device_uuid: canonical, display_name, restored:true}` to adopt. **Merge = pure `src/lib/scoreMerge.ts` `planScoreMerge`** (best score per `(game_id, puzzle_date)`; loser row deleted so each surviving row's score stays consistent with its `data` blob — old wins ⇒ re-point old + delete canonical, else delete old). Route executes the plan (batched `.in("id",…)` update/delete) + deletes the old profile row. Client: **`adoptDeviceIdentity(deviceId, name?)`** in `useGameStore` (atomic: deviceId + name + profileLinked + authLinked); callback awaits the response, adopts when `device_uuid` differs, sets `leksokipos-needs-restore` + `signin-restore-welcome` flags (visible toast deferred — user chose "flag now, tiny toast later").
3. **User decisions (AskUserQuestion)** — (a) Bearer-JWT + service-role over new RLS DELETE policy; (b) fold restore into `/api/auth/link`; (c) welcome = flag-now/toast-later.
Tests: `scoreMerge.test.ts` (7), `authLinkRoute.test.ts` rewritten to intent-aware harness (17: 401 paths, body-id-ignored, name precedence, device_id back-fill, idempotent, restore adopt/delete/merge branches), `useGameStore.test.ts` +5 (`adoptDeviceIdentity`). Verification: **1194 tests pass (6 skipped live-DB) · eslint clean · build exit 0**. **Slices 3–5 remain** (Disconnect unification, visibility rule/`onSignIn` required, `identity_audit` migration).

---

## Session 56 — 2026-07-02: Sign-in Restore design grill — ADR 0012, zero code ✅
Resumed `.claude/handoffs/googleLoginIdentity.md` via `/grill-with-docs`; all open identity questions resolved, **nothing implemented**.
1. **Discovery** — unique index `player_profiles_auth_user_id_key` + upsert-on-device in `/api/auth/link` means second-device Google sign-in 500s today; also link route trusts client-supplied `auth_user_id` (squatting risk).
2. **Decisions (all user-approved)** → **ADR 0012**: auth account = durable anchor, device = session; Sign-in Restore adopts the linked profile's DeviceId (TransferCode-claim mechanic) + silent union merge (best score per puzzle, auth name wins, old row deleted); Disconnect (profile *or* Google) = fresh DeviceId; restore/link endpoints derive `auth_user_id` from verified JWT only; achievements earnable anonymously by DeviceId, immutable facts table, catalog in code, frozen IDs, client-trust model; `game_scores` append-forever; TransferCode retained as no-account fallback; Google button offered wherever not AuthLinked (`onSignIn` to become required).
3. **Docs** — ADR 0012 written; ADR 0007 marked superseded-in-part; CONTEXT.md glossary (Sign-in Restore, Disconnect, Achievement, Admin Restore; DeviceId/AuthLinked/TransferCode revised) + append-forever persistence decision; `docs/admin-restore.md` break-glass SQL recipe (email → auth_user_id → device_uuid → TransferCode insert).
4. **Next session** — implement per rewritten handoff `.claude/handoffs/googleLoginIdentity.md`, slices 1–5 in order, **`/tdd` mandated by user**; achievements epic only after.
No tests/build run — docs-only session.

---

## Session 55 — 2026-07-02: Test-suite audit — gap fill + duplication cleanup ✅
Full scan of source vs tests (report + baseline runs: `.claude/aiHelper/test-audit/audit.md`). Ran concurrently with session 54 (separate session, same tree); final verification includes both.
1. **Audit** — 1128-test baseline; ranked gap list (top: Stavrolekso UI layer entirely untested, Vres Tin Frasi components untested); duplication findings; cleared false suspects (app/leksindeseis `ConnectionsBoard` = re-export shim; `useLeksiarxeioScoreSubmission` deliberate, not a dup). Also removed accidental `x= 1` / `y = '1'` junk from uncommitted `GuessGrid.tsx` (broke 2 suites).
2. **soul.md rule amended (user-authorized)** — "never delete tests" → coverage never goes down; consolidation of demonstrable duplicates allowed with logged justification.
3. **Consolidations** — `gameLogic.test.ts` (leksokipos) converted to a Greek fixture (production alphabet) and absorbed `greekLogic.test.ts` (deleted: 10/12 scenario dups + brittle hard-coded fallback puzzle ID `2028-12-26-el`; its loader cases already in `leksokiposDataLoader.test.ts`). `mobileLayout.test.tsx` trimmed 7→3: backdrop/card shell assertions now owned by `modal.test.tsx` (HowToPlayModal delegates to the Modal primitive since session 53); kept the HowToPlay-specific overflow contracts.
4. **New suites (quick wins)** — `vrestifrasi/dataLoader.test.ts` (community consume, rotation fallback, accent normalisation), `vrestifrasi/scoring.test.ts`, `shared/useProfile.test.ts` (create/transfer/claim/disconnect wiring), `shared/useLeaderboardProfile.test.ts` (save logic + slot bundle). `leaderboardModal.test.tsx` moved to `src/test/leksokipos/` (folder convention).
5. **Docs** — memory.md coverage map corrected (stale `useScoreSubmission` attribution, new rows); reflections.md mobile-keyboard tension → resolved (covered by `keyboardInteraction.test.tsx`); backlog (Stavrolekso UI tests, Vres components, small surfaces) recorded in audit.md §D. E2E is in a separate Playwright session.
Verification: **1174 tests pass (6 skipped live-DB) · eslint clean · build exit 0**.

---

## Session 54 — 2026-07-02: Architecture deepening — Community Puzzle intake validation ✅
Ran `/improve-codebase-architecture` (report: `.claude/aiHelper/architecture-review-2026-07-02.html`, 6 candidates); implemented top candidate.
1. **Four pure validation adapters** — each community-puzzle submission route's inline `validate()` moved to the game's lib: `src/games/{leksiarxeio,leksindeseis,vrestifrasi,stavrolekso}/lib/validateSubmission.ts`. Routes are now pure config declarations. Word-pool-heavy modules (leksiarxeio, vrestifrasi) deliberately NOT exported from lib barrels — imported only by their own route, preserving edge-bundle isolation.
2. **Stavrolekso edit hole closed** — PATCH `[id]` validated nothing about `data`, so a creator edit could regress a puzzle below the submission invariants (grid size, slots, both directions). Now calls shared `validateStavroleksoData` after the PIN check → 400. Invariant messages Greek-ified (were English; the maker displays them verbatim).
3. **Maker dedup** — PIN regex + across/down check were verbatim copies of the server's; maker now imports `EDIT_PIN_PATTERN`/`EDIT_PIN_ERROR`/`validateStavroleksoData` from the lib barrel (client-safe). Authoring-only gates (connectivity, filled slots) stay maker-local.
4. Lifecycle module comment + CONTEXT.md lifecycle entry updated. Remaining report candidates (not built): HTTP intake module, admin-secret unification (header vs body), Tile/Keyboard twins (ADR 0009 tension), LeaderboardModalBase config, Leksikastirio page split.
Tests: 4 new pure `validateSubmission.test.ts` files (22 tests); `stavroleksoIdRoute.test.ts` PATCH fixture made invariant-valid + new 400-regression test for invalid edits. Verification: **1158 tests pass · eslint clean · build exit 0**.

---

## Session 53 — 2026-06-29: UI consolidation — per-game accent, Modal primitive, recipes split (ADR 0009) ✅
Grilled (`/grill-with-docs`) the recipes.ts/chrome consolidation; wrote **ADR 0009**. Goal: shared chrome (common feel) + a per-game signature colour, all one-line-changeable. Four parts, each test/eslint/build-green:
1. **Per-game accent token** — `--game-accent`/`--game-accent-foreground` in `globals.css`, set via `[data-game="…"]` selectors; the 4 games' root wrappers (`page.tsx`/`[outer]/page.tsx`) carry `data-game`. `LeaderboardModalBase` consumes the token directly — `pillActive`/`playerMark` props **deleted**, removing the per-game literal palette strings (amber/green/purple). Player-row tint `bg-brand/10`→`bg-game-accent/10`. Brand accents decoupled from feedback tokens (Leksiarxeio was reusing `correct`, Leksindeseis/Vres `misplaced`).
2. **Modal primitive** — new `src/components/shared/Modal.tsx` (`center`|`sheet`) owns backdrop/z-index/overlay-click/close-button. 9 modals migrated (5 center, 3 community-submit incl. success states, 1 leaderboard sheet); copy-pasted shells deleted. New `modal.test.tsx` (12).
3. **Recipes split** — Leksokipos-only recipes → new `src/components/leksokipos/styles.ts`; `src/styles/recipes.ts` now genuinely platform-shared (CLAUDE.md "no speculative shared/"). 9 single-token `color*` aliases inlined (the token is the single source). Tests split: `recipes.test.ts` (platform) + new leksokipos `styles.test.ts`.
4. **`lightTrigger` deleted** — dead prop (no production caller; Leksiarxeio never set it); its `border-stone-600 text-stone-300 hover:bg-stone-700` literals gone; HowToPlay tooltip tokenised `bg-stone-800`→`bg-inverted`.
Docs: ADR 0008 cross-referenced (recipes-split refinement); memory.md Theming row + test-coverage map updated; investigation handoff marked RESOLVED. Verification: **1104 tests pass · eslint clean · build exit 0**.

---

## Session 52 — 2026-06-29: Bug fix — leaderboard modal missing "back to today" link ✅
`footerSlot` and `emptySlot` in `src/components/leksokipos/LeaderboardModal.tsx` used `date < today` as the condition for showing a navigation link, so no link appeared when the player was on a past puzzle and selected the "Σήμερα" pill. Changed condition to `date !== defaultPuzzleId` so a link shows whenever the selected date differs from the currently-played puzzle. Added distinct label "Παίξε το σημερινό παζλ →" when the selected date is today. Added 2 new tests (back-to-today link, no link when current puzzle pill selected); updated 1 existing test label. 1115 tests pass · eslint clean · build exit 0.

---

## Session 51 — 2026-06-28: Bug fix — past-puzzle navigation locked by useDayChange + givenUp bleed ✅
Two bugs fixed. Root cause of the reported production issue: `useDayChange` called `check()` on mount and redirected any puzzle with `date < today` — including puzzles the player deliberately navigated to via the leaderboard day strip — back to today's (given-up) game. Secondary pre-existing bug: `GameBoard` shared `useReducer` state (including `givenUp:true`) between puzzles when navigating without a remount.
**Fix 1 (primary — useDayChange):** Added early return in `useDayChange` if `puzzle.date < mountDate` at mount time. Past puzzles are deliberately visited; they should never be auto-redirected. The stale-tab day-rollover case is preserved via the `visibilitychange` listener, which still fires when a player reopens a tab where TODAY's puzzle has become stale overnight.
**Fix 2 (secondary — GameBoard):** `key={puzzle.id}` on `<GameBoard>` in `LeksokiposLayout.tsx` — forces React to remount when puzzle changes, preventing `givenUp`/`foundWords` state from leaking between puzzles (Next.js App Router reuses client components on same-route navigations).
**Fix 3 (secondary — shouldSave):** Added `shouldSave: snap => snap.foundWords.length > 0 || snap.givenUp` guard to `useRoundPersistence` in `useGameState.ts` — prevents the initial empty state from being written to localStorage on mount, which was blocking cross-device server restore for unplayed puzzles.
**Tests:** `useDayChange.test.ts` — rewrote suite: no redirect on mount for past puzzle, no redirect on visibilitychange for past puzzle, day-rollover redirect via visibilitychange for today's puzzle (with `vi.setSystemTime`). `LeksokiposLayout.test.tsx` — mock updated + remount assertion. `GameBoard.test.tsx` — givenUp/foundWords don't carry to a new puzzle.
Verification: **1113 tests pass · eslint clean · build exit 0**.

---

## Session 50 — 2026-06-28: Architecture deepening — lifecycle consume + guess-game spine + sync seam ✅
Ran `/improve-codebase-architecture`; implemented all 4 candidates.
1. **Completed the Community Puzzle Lifecycle (consume transition).** Added `consumeApprovedPuzzle<TData>(table)` to `src/lib/communityPuzzleLifecycle.ts` — claims oldest approved row (FIFO), deletes it, returns `{ data, submitter_name }` or null on empty/error. The "query approved → delete → fallback" block was triplicated in the three data loaders; they're now thin row→Puzzle mappers (`data/leksiarxeio`, `data/vrestifrasi`, `data/leksindeseis`). The module now owns all four transitions (submit/list/review/consume). CONTEXT.md lifecycle entry updated.
2. **Shared guess-game spine.** New `src/hooks/useGuessRound.ts` — owns the identical reducer→`useRoundPersistence`→`useGameEndCallback`→score wiring that `useLeksiarxeioState` + `useVresTinFrasiState` had copied. Persists the shared `{guesses,status}` snapshot; games keep only their action wrappers, letter-state map, exposed fields. Both hooks refactored onto it (behaviour identical).
3. **Folded orphaned `dateToIndex`.** `data/leksindeseis` had a byte-identical private copy of `lib/puzzleRotation.dateToIndex` → now imports the shared one.
4. **One seam for Leksokipos cross-device sync (candidate #3).** New `src/games/leksokipos/sync.ts` owns BOTH directions of the `game_state` wire: `pushFoundWords` (was inlined in `useGameStateSync`) + `pullSnapshot` (the fetch→reconstruct-score→snapshot block that was copy-pasted twice in `useGameState`: mount-time + `restoreFromServer`). Hooks now own only effects/gates/dispatch; the URL, JSON shape, and snapshot reconstruction live in one place. No behaviour change — the pre-existing hook tests (`useGameState.test.ts`, `useGameStateSync.test.ts`) passed unchanged as the guard. Motivated by a historical bug where, after a transfer-code sync, the player name restored but found words didn't — exactly the drift one-pull prevents.
Tests: new `useGuessRound.test.ts` (12); new `leksokiposSync.test.ts` (7 — push wire shape + pull rebuild/score/null paths, the found-words regression guard); +2 push-dedup/empty-backfill tests in `useGameStateSync.test.ts`; extended `communityPuzzleLifecycle.test.ts` with `consumeApprovedPuzzle` (4).
Verification: **1109 tests pass · eslint clean · build exit 0**.

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

## Older Sessions

| Session | Date | Summary |
|---------|------|---------|
| 48 | 2026-06-27 | Fixed broken score cleanup (`upsertAndClean` used `void` not `await` → Supabase thenable never fired; all scores retained). Removed cleanup from `upsertAndClean`; new `cleanup-scores` GET route (CRON_SECRET, service role, deletes `game_scores`+`game_state` >7d); `vercel.json` daily cron. Tests. **Needs `SUPABASE_SERVICE_ROLE_KEY`+`CRON_SECRET` in Vercel env.** |
| 45 | 2026-06-22 | Leksikastirio admin `max-w-6xl` viewport; nomination re-proposal warning (`/api/nominations/lookup` edge route + NominationModal blur-check; rejected→mandatory note, pending→non-blocking info); apply-nominations skill refreshed; 4 tests. Deferred: accent-variant dedup, admin rejection reason. |
| 44 | 2026-06-22 | Nomination apply pipeline completed: `scripts/lib/resync-puzzles.mjs` surgical `puzzles-el.json` re-sync coupled into `apply-nominations.mjs`; `npm run apply-nominations[:dry]` with `.env` loading; 13 tests. Operator flow: admin ✓/✕ → dry-run → apply → diff → deploy. |
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

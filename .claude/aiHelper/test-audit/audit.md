# Test Suite Audit — 2026-07-02

Baseline: **1128 passed, 6 skipped, 0 failed** across 80 test files (~25 s).
The 6 skips are the two `describe.skipIf` live-DB suites (`rlsInvariantsLiveDb`, `cleanupScoresLiveDb`) — intentional, gated on credentials.

> Incidental fix during the audit: stray `x= 1` / `y = '1'` lines at module scope in
> `src/components/leksiarxeio/GuessGrid.tsx` (uncommitted, accidental keystrokes) broke
> 2 suites. Removed; suite green again.

---

## A. Coverage gaps (features with weak or no tests)

Ranked by risk × size.

### A1. 🔴 Stavrolekso UI layer — the entire interactive game is untested
Only the pure libs (`lib.test.ts`, 26 tests) and API routes are covered. Untested:
- `src/games/stavrolekso/StavroleksoGrid.tsx` — the interactive crossword grid (React component living in games/, already an acknowledged anomaly)
- `src/app/stavrolekso/[id]/StavroleksoPlayer.tsx` — play flow: input, answer checking, completion
- `src/app/stavrolekso/maker/page.tsx` — the whole crossword **maker** (build grid, validate, submit to community)
- `src/app/stavrolekso/page.tsx` — community browser

Every other game has board/grid/interaction tests; Stavrolekso has none. The maker is
the largest untested feature in the codebase.

### A2. 🔴 Vres Tin Frasi component layer — zero component tests
Logic is well covered (evaluatePhraseGuess, letterState, reducer). Untested:
`VresTinFrasiBoard` (game orchestration), `PhraseGrid`, `Keyboard`, `Tile`,
`VresTinFrasiPageClient`, `VresTinFrasiLeaderboardModal`, `HowToPlayModal`.
Its sibling Leksiarxeio has guessGrid + keyboardInteraction + theme + header tests —
the asymmetry is unjustified; the two games share the same interaction model.

### A3. 🟡 Vres Tin Frasi data loader — untested
`src/data/vrestifrasi/index.ts` (`getTodaysVresTinFrasiPuzzle`, `buildPuzzle`).
Leksiarxeio and Leksindeseis loaders both have dedicated dataLoader tests. The risky
bit here is `buildPuzzle`'s multi-word normalisation (accented community phrase →
`normalizedWords` + `wordLengths`) — a community submitter typing accents exercises it
on the live site.

### A4. 🟡 scoreVresTinFrasi — untested pure function
`src/games/vrestifrasi/lib/scoring.ts`. Trivial, but `scoreLeksiarxeio` (same formula)
is tested; soul.md requires tests for all pure functions.

### A5. 🟡 useProfile hook — no direct tests
`src/hooks/useProfile.ts` — device→profile claim/link/transfer client logic. The API
routes are tested (`profileRoute`, `transferRoute`) and some UI states via
`leaderboardModal.test.tsx`, but the hook's own state machine is not.

### A6. 🟡 LeaderboardProfileSlot / useLeaderboardProfile — new consolidation, indirect coverage only
Added in commit `7606586` (leaderboard consolidation). Exercised only through the
Leksokipos `leaderboardModal.test.tsx`; the other three game leaderboard modals that now
delegate to it have no tests. One focused test of `useLeaderboardProfileSlot` would
cover all four consumers.

### A7. 🟢 Smaller untested surfaces (low risk, cheap to add if desired)
- `src/app/auth/callback/page.tsx` — OAuth PKCE callback (useAuth hook itself is tested)
- `src/components/shared/HomeTrophyButton.tsx`, `FeedbackBanner.tsx` (graduated shared component!), `ProfileSection.tsx` (only via leaderboard modal)
- `src/components/leksokipos/GodModePanel.tsx` internals — gating/open/close/actions are covered behaviourally via `GameBoard.test.tsx` God Mode section; panel-internal rendering is not. Acceptable.
- `src/config/gameRules.ts` — consumed by tested code; fine.

### A8. 🟢 E2E — still zero
goals.md item 5 (Playwright Leksokipos happy-path) remains open. `@playwright/test`
is already a devDependency. This would be the only test that exercises a real browser
+ Next.js page composition (nothing above tests pages end-to-end).

---

## B. Duplication and low-value tests

### B1. `greekLogic.test.ts` — ~10 of 12 tests duplicate `gameLogic.test.ts`
Historical file ("prove logic works with Greek Unicode"). Today the platform is
Greek-only, yet the *canonical* `gameLogic.test.ts` fixture is still **Latin**
("paint"/"painted") — the proof file outlived its purpose and the main file tests a
non-production alphabet.
- isPangram/scoreWord/validateWord scenarios: same assertions, different alphabet.
- Its 2 `getPuzzleForDate` tests duplicate `leksokiposDataLoader.test.ts` (which
  already tests date-match + fallback).
- **Maintenance trap**: hard-coded fallback ID `2028-12-26-el` ("update this ID when
  new puzzles are added") — breaks every time puzzles are appended, tests data not logic.

**Recommendation**: switch `gameLogic.test.ts` fixture to Greek (production alphabet),
fold in anything unique from greekLogic, delete `greekLogic.test.ts`. Net −12 tests,
zero coverage loss, one brittleness removed.

### B2. `mobileLayout.test.tsx` — ~4 of 7 assertions now re-test the Modal primitive
Written pre-session-53. `HowToPlayModal` now delegates its shell to
`src/components/shared/Modal.tsx`, whose backdrop/centring/width/padding contracts are
covered by `modal.test.tsx` (12 tests). Still unique and worth keeping: the rule-list
overflow assertions (`overflow-y-auto`, `max-h-[70dvh]`).
**Recommendation**: trim to the HowToPlayModal-specific assertions (or move them into a
HowToPlayModal test) and drop the backdrop-structure ones.

### B3. `theme.test.tsx` (Leksiarxeio) — first 7 tests are brittle class-string checks
`Tile`/`Keyboard` token assertions ("className contains border-border") restate the
component source line by line. The **responsive-layout** section (min-w overflow
regression, Pixel 6) is a documented regression guard — keep. The token section is
low-value but cheap; lowest-priority cleanup.

### B4. Trivial constant assertion
`gameLogic.test.ts`: `it("MAX_SCORE_CAP is 600")` — constant-equals-constant. Harmless;
fold into the cap-behaviour test if touched anyway.

### B5. NOT duplication (checked and cleared)
- `src/app/leksindeseis/ConnectionsBoard.tsx` — 237-byte re-export shim, not a copy.
- `useLeksiarxeioScoreSubmission` vs `useScoreSubmission` — deliberately separate hooks
  (per-length vs strictly-increasing-dedup semantics); each has its own test file. Fine.
- `puzzle.test.ts`, `supabase.test.ts`, `performance.test.ts`, `noAccents.test.ts`,
  `leksokiposRouting.test.ts` — all focused, non-overlapping, data-invariant or
  cost-guard value. Keep.

---

## C. Meta / hygiene

1. **memory.md Test Coverage Map is stale**: lists ~45 of the 80 files; claims
   `useScoreSubmission.test.ts` covers Leksiarxeio `submitLength` (that lives in
   `useLeksiarxeioScoreSubmission.test.ts`); missing all vrestifrasi/stavrolekso/route
   test entries added since.
2. **reflections.md stale item**: "no test verifying the on-screen keyboard dispatches
   end-to-end" — `keyboardInteraction.test.tsx` now covers letter/delete/enter clicks
   through to reducer state. Can be moved to Resolved.
3. **File placement**: `src/test/leaderboardModal.test.tsx` sits at the test root; every
   other test lives in a game/shared subfolder (it tests the Leksokipos modal →
   belongs in `src/test/leksokipos/`).
4. **No coverage reporting** configured (would need `@vitest/coverage-v8` — a new
   devDependency, requires approval per standing rules).
5. **soul.md tension**: soul says "I never delete tests, only add them" — B1/B2/B3
   require explicit user authorization to consolidate/delete.

---

## D. Outcome (2026-07-02, same session) + remaining backlog

**Done (user-authorized):** soul.md rule amended (coverage never goes down;
justified consolidation allowed). B1 done — `gameLogic.test.ts` converted to the Greek
fixture, `greekLogic.test.ts` deleted. B2 done — `mobileLayout.test.tsx` trimmed to the
HowToPlayModal-specific overflow contracts. Quick wins A3/A4/A5/A6 done — new suites:
`vrestifrasi/dataLoader.test.ts`, `vrestifrasi/scoring.test.ts`,
`shared/useProfile.test.ts`, `shared/useLeaderboardProfile.test.ts`.
`leaderboardModal.test.tsx` moved into `src/test/leksokipos/`. memory.md map corrected,
reflections.md keyboard tension resolved. Final: **1174 pass · eslint clean · build exit 0**.

**Remaining backlog (deliberately not built, in priority order):**
1. **A1 Stavrolekso UI tests** — StavroleksoGrid, StavroleksoPlayer, maker page. The
   largest untested feature. (Session 54 added `validateSubmission` coverage for its
   intake; the interactive layer is still untested.)
2. **A2 Vres Tin Frasi component tests** — Board/PhraseGrid/Keyboard/Tile, mirroring
   the Leksiarxeio suites.
3. **A7 small surfaces** — auth/callback page, HomeTrophyButton, FeedbackBanner,
   ProfileSection direct tests.
4. **B3 theme.test.tsx token section** — optional consolidation; regression half stays.
5. **A8 E2E** — being handled in a separate session (Playwright), 2026-07-02.

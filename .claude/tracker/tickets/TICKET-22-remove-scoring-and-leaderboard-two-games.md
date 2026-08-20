# Remove the leaderboard and all scoring from Λεξιαρχείο and Βρες τη Φράση

**Status:** ready
**Spec:** [ADR 0027](../../../docs/adr/0027-two-games-lose-scoring-and-community-submission.md) §1–§3

## Why

Both Games ship with a leaderboard nobody asked for and a score that exists only to feed it. The
operator's pre-launch pass removes both. Per ADR 0027 §1 the `scores` capability goes with the
`leaderboard` one — keeping the write while deleting the board would leave rows accumulating in
`game_scores` that nothing ever ranks, which is the needless information the pass exists to remove.

ADR 0020's opt-in construction is what makes this tractable: revoking the capabilities narrows
`LeaderboardGameId` and `ScoreSubmissionGameId`, so **every surface that consumed them stops
compiling**. Work from the compiler errors — the type system enumerates the call sites, so nothing
is found by grepping and nothing is missed.

Scoring is removed *whole*, including the local `πόντοι` number in the Result Panel and share text
(ADR 0027 §3). That is the one part reaching outside the two Games: `ShareResultPanel.score` becomes
optional.

## Scope

### Registry — do this first, then follow the compiler

- [ ] `src/config/games.ts` — set `capabilities: []` on both `leksiarxeio` and `vrestifrasi`.
      Leave `wip` and `hidden` alone; these Games stay live and listed (ADR 0022).
      Rewrite each row's capability comment — Λεξιαρχείο's currently explains that it posts through
      `useLeksiarxeioScoreSubmission`, which is being deleted.

### Leaderboard surfaces

- [ ] `src/components/shared/GameLeaderboardModal.tsx` — delete the `leksiarxeio` and `vrestifrasi`
      rows from `GAME_LEADERBOARD_CONFIG`. The `Record<LeaderboardGameId, …>` makes this mandatory,
      not optional.
- [ ] `src/components/leksiarxeio/LeksiarxeioBoard.tsx` and
      `src/components/vrestifrasi/VresTinFrasiBoard.tsx` — remove the `GameLeaderboardModal` import,
      its render, and the state driving it.
- [ ] Λεξιαρχείο's header 🏆 trigger. Note it is **not** in `GamePageChrome` — memory.md records
      Λεξιαρχείο as deliberately out of that component, so its trigger is hand-wired on the page.
      Βρες τη Φράση **is** a `GamePageChrome` member, so its 🏆 comes from the render prop's
      `leaderboard` bundle; remove the consumer, not the shared component.
- [ ] `src/app/page.tsx` — the picker-card 🏆 is derived from the capability via `hasLeaderboard()`
      and disappears on its own. **Verify, do not edit.**

### Scoring

- [ ] Delete `src/games/leksiarxeio/lib/scoring.ts` and `src/games/vrestifrasi/lib/scoring.ts`, and
      their re-exports from each `lib/index.ts`.
- [ ] `src/hooks/useGuessRound.ts` — delete the `scoreFn` prop, the derived `score` it returns, and
      the doc line describing it. Both callers are the two Games here, so this is a clean removal,
      not an optional prop (ADR 0027 Consequences).
- [ ] `src/games/leksiarxeio/hooks/useLeksiarxeioState.ts` and
      `src/games/vrestifrasi/hooks/useVresTinFrasiState.ts` — drop the `scoreFn` argument.
- [ ] `src/games/leksiarxeio/lib/shareText.ts` — delete `scoreLeksiarxeioDay` and the `score` field
      it feeds into `composeShareText`.
- [ ] `src/games/vrestifrasi/lib/shareText.ts` — same, remove the `score` field.
- [ ] `src/lib/shareText.ts` — `composeShareText`'s `score` must become optional and the `Σκορ: N`
      line must be omitted (not rendered as `Σκορ: 0`) when absent. This is shared by every Game —
      change the contract, never the other Games' output.
- [ ] `src/components/shared/ShareResultPanel.tsx` — make `score?: number` and give the panel a
      layout for its absence. The `{score} πόντοι` heading is the component's main heading, so
      decide what the heading becomes when there is no score rather than rendering an empty element.
      **Six other boards pass a score and must look identical afterwards.**

### Score submission

- [ ] Delete `src/hooks/useLeksiarxeioScoreSubmission.ts`.
- [ ] `src/app/api/game-scores/route.ts` — delete the entire `game_id === "leksiarxeio"` branch, the
      `LeksiarxeioScorePayload` type, `VALID_WORD_LENGTHS`, and the `LEKSIARXEIO` import that only
      serves it. The route keeps one code path.
- [ ] Delete `src/lib/scoreMerge.ts` — `mergeLengthScore` exists only for that branch.
      **Check first:** confirm `planScoreMerge` (Sign-in Restore, ADR 0012) does not live in the
      same file. If it does, delete only `mergeLengthScore` and its `data` handling.
- [ ] `src/hooks/useScoreSubmission.ts` — no edit expected; `ScoreSubmissionGameId` narrows itself.
      Verify the Βρες τη Φράση call site is the only removal needed.

### Tests

- [ ] Delete `src/test/vrestifrasi/scoring.test.ts` and `src/test/shared/useLeksiarxeioScoreSubmission.test.ts`.
- [ ] Update, do not delete: `src/test/shared/registryCoverage.test.tsx` (the drift guard between the
      capability and `GAME_LEADERBOARD_CONFIG` — it should now *prove* both Games are absent),
      `src/test/shared/gameScoresRoute.test.ts`, `src/test/shared/scoreMerge.test.ts`,
      `src/test/shared/useGuessRound.test.ts`, `src/test/shared/shareResultPanel.test.tsx`,
      `src/test/shared/shareText.test.ts`, `src/test/leksiarxeio/shareText.test.ts`,
      `src/test/vrestifrasi/shareText.test.ts`, `src/test/leksiarxeio/roundEnd.test.tsx`,
      `src/test/vrestifrasi/roundEnd.test.tsx`, `src/test/leksiarxeio/header.test.tsx`,
      `src/test/shared/gamePageChrome.test.tsx`.
- [ ] Add a guard that `ShareResultPanel` renders no score element when `score` is undefined **and**
      renders unchanged when it is present. This prop is one day old; the guard is what stops the
      no-score layout regressing the other six Games.
- [ ] Grep `.claude/aiHelper/coverageMap.md` **before** touching any test file (standing rule), and
      update it at the end.

### Docs

- [ ] `CONTEXT.md` line 116 — the **Score** *(Vres Tin Frasi leaderboard)* glossary entry. The term
      is retired; rewrite or delete the entry, do not annotate it.
- [ ] `CONTEXT.md` line 242 — the `game_scores` table row lists both ids in its derived set and
      describes the `data` jsonb as "Leksiarxeio's alone". Both halves become false.
      **Coordinate with TICKET-24**, which drops the column.
- [ ] `CONTEXT.md` line 276 / 278 — check the append-forever and launch-reset paragraphs still read
      true with two fewer scoring Games.
- [ ] `README.md` §"High scores / leaderboard" — it says which Games have a board is *derived, not
      listed*, which stays true and needs no edit. Verify rather than assume.
- [ ] `.claude/aiHelper/memory.md` — the **Round End / Result Panel** row states the share text is
      four lines including `Σκορ: N` for every Game. Rewrite; that becomes false for two Games.
      Also check the **Page chrome** row's Βρες τη Φράση `leaderboard` render-prop description.
- [ ] `.claude/aiHelper/goals.md` line 27 and the live-games summary — check for leaderboard claims.
- [ ] ADR 0014 (leaderboards are higher-is-better) — Βρες τη Φράση is its worked example. Amend it;
      the invariant survives, its example does not.
- [ ] ADR 0025 — amend for the optional `score` prop.
- [ ] `.claude/tracker/issues/ISSUE-03-thin-e2e-coverage.md` — its headline count says five of the
      six never-loaded routes are "launched and capability-bearing". Vres Tin Frasi stops being
      capability-bearing here; correct the count rather than the adjective.

## Done when

`npm run test -- --run`, `npx eslint .` and `npm run build` all pass with zero failures; `grep -r
"scoreLeksiarxeio\|scoreVresTinFrasi\|useLeksiarxeioScoreSubmission" src/` returns nothing; neither
Game renders a 🏆 button on its page or its picker card; both Result Panels show the reveal line and
the share button with no `πόντοι` heading and no leaderboard link; the other six Games' Result
Panels are visually unchanged; and `npm run test:e2e` passes (mandatory — this touches pages, layout
and a shared chrome component).

**Do not run the migration from this ticket.** TICKET-24 owns every schema change and must not run
until this is deployed to production (ADR 0027 §5).

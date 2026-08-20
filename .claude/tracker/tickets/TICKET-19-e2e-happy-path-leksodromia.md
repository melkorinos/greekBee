# Browser happy path for Leksodromia

**Status:** ready
**Spec:** `.claude/aiHelper/e2e-coverage/analysis.md` §5 Tier A (A2), ISSUE-03

## Why

`/leksodromia` is a launched Game with both capabilities and **no browser test loads
it at all**. It is the only timed Game on the Platform, which makes it the one whose
real-browser behaviour is least like its jsdom behaviour: a decay bar driven by
`requestAnimationFrame` and a round clock behave differently under a real event loop.
ISSUE-10 (leksodromia board test timeouts) is evidence this suite is already the
awkward one to drive.

## Scope

- [ ] Add `e2e/pages/LeksodromiaPage.ts` — locators for the `h1`, the scrambled word
      area, the letter inputs, `data-testid="btn-enter"`, and the round/score readout
- [ ] Register the fixture in `e2e/fixtures.ts`
- [ ] Add `e2e/leksodromia.spec.ts` with one test: load, solve **one** scrambled word,
      assert the board advances (word counter or score increments)
- [ ] **Pin the puzzle** with `?puzzle=YYYY-MM-DD` (a fixed past date) — selection and
      scramble are pure functions of the date over static answer pools, so a pinned
      date makes the first word and its answer deterministic. Comment the answer.
- [ ] **Assert state, never elapsed time.** No assertion may depend on the clock, the
      decay bar's width, or a `waitForTimeout`. If the round timer makes the test
      flaky, prefer a shorter path over a longer timeout, and say so in the file.
- [ ] Stop after one word — 10 words is a finished round, which fires
      `useScoreSubmission` and writes to the shared production `game_scores`

## Done when

`npm run test:e2e` passes with one new Leksodromia test, run three times locally with
no flake, no new row appears in `game_scores`, and `npx eslint .` is clean.

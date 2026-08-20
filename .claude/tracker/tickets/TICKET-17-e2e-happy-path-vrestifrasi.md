# Browser happy path for Vres Tin Frasi

**Status:** ready
**Spec:** `.claude/aiHelper/e2e-coverage/analysis.md` §5 Tier A (A1), ISSUE-03

## Why

`/vres-tin-frasi` is a launched Game with the `scores` and `leaderboard` capabilities
and **no browser test loads it at all**. Its reducer, scoring and phrase layout are
well covered in jsdom, but nothing anywhere proves that the page mounts in a real
browser and that a keypress reaches the reducer. A hydration error, a broken server
component boundary, or a keyboard wired to nothing would ship green today.

This is the first of the five Tier A specs and the closest in shape to the existing
Leksiarxeio flow test, so it also **establishes the pattern the other four copy**:
a page object under `e2e/pages/`, a fixture entry, a pinned `?puzzle=` date, and a
round that is deliberately never finished.

## Scope

- [ ] Add `e2e/pages/VresTinFrasiPage.ts` modelled on `e2e/pages/LeksiarxeioPage.ts`
      — locators for the heading, the guess grid (`data-testid="guess-grid"` if the
      phrase board reuses it, otherwise the phrase grid's own hook) and the Enter
      button; a `typeWord()` that **clicks `aria-label="Letter Χ"` keyboard buttons**
      rather than calling `keyboard.type()` (Playwright cannot deliver Greek `e.key`
      values — this is why both existing page objects click)
- [ ] Register the fixture in `e2e/fixtures.ts`
- [ ] Add `e2e/vrestifrasi.spec.ts` with one test: load, enter one valid phrase word,
      submit, assert the first guess row renders scored tiles (the `aria-label`
      carries `correct` / `present` / `absent`, same as Leksiarxeio)
- [ ] **Pin the puzzle** with `?puzzle=YYYY-MM-DD` (a fixed past date). Rotation is a
      pure function of the date over committed JSON, so a pinned date makes both the
      phrase and the valid-word choice deterministic instead of depending on whatever
      ships that morning. Record in a comment which word was verified and why.
- [ ] **Stop after one guess.** Do not finish the round — round end is what fires
      `useScoreSubmission`, and that writes a real row to the shared production
      `game_scores`, which is append-forever.

## Done when

`npm run test:e2e` passes with one new Vres Tin Frasi test that fails if the page
stops mounting or the keyboard stops reaching the reducer, no new row appears in
`game_scores`, and `npx eslint .` is clean.

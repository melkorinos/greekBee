# Browser happy path for Vres Tin Frasi

**Status:** ready
**Blocked by:** nothing. ADR 0027 §1-§3 shipped on 2026-08-20, so the post-removal surface this
spec asserts against now exists in the branch.
**Spec:** `.claude/aiHelper/e2e-coverage/analysis.md` §5 Tier A (A1), ISSUE-03,
[ADR 0027](../../../docs/adr/0027-two-games-lose-scoring-and-community-submission.md)

## Why

`/vres-tin-frasi` is a launched Game and **no browser test loads it at all**. Its reducer, scoring
and phrase layout are well covered in jsdom, but nothing anywhere proves that the page mounts in a
real browser and that a keypress reaches the reducer. A hydration error, a broken server component
boundary, or a keyboard wired to nothing would ship green today.

This is the first of the five Tier A specs and the closest in shape to the existing Leksiarxeio flow
test, so it also **establishes the pattern the other four copy**: a page object under `e2e/pages/`,
a fixture entry, and a pinned `?puzzle=` date.

**Rewritten 2026-08-20.** This ticket previously turned on a constraint that no longer exists: it
required the test to stop after a single guess, because finishing the round fired `useScoreSubmission`
and wrote a real row to the shared production `game_scores`. ADR 0027 §1 revoked the Game's `scores`
capability, so **there is no write to avoid** — and the surface the spec asserts against changes
shape. That makes this ticket cheaper and its coverage better: a full round is now the natural test.

## Scope

- [ ] Add `e2e/pages/VresTinFrasiPage.ts` modelled on `e2e/pages/LeksiarxeioPage.ts`
      — locators for the heading, the guess grid (`data-testid="guess-grid"` if the
      phrase board reuses it, otherwise the phrase grid's own hook) and the Enter
      button; a `typeWord()` that **clicks `aria-label="Letter Χ"` keyboard buttons**
      rather than calling `keyboard.type()` (Playwright cannot deliver Greek `e.key`
      values — this is why both existing page objects click)
- [ ] Register the fixture in `e2e/fixtures.ts`
- [ ] Add `e2e/vrestifrasi.spec.ts` with a test that loads, enters one valid phrase word, submits,
      and asserts the first guess row renders scored tiles (the `aria-label` carries
      `correct` / `present` / `absent`, same as Leksiarxeio)
- [ ] **Pin the puzzle** with `?puzzle=YYYY-MM-DD` (a fixed past date). Rotation is a
      pure function of the date over committed JSON, so a pinned date makes both the
      phrase and the valid-word choice deterministic instead of depending on whatever
      ships that morning. Record in a comment which word was verified and why.
      Note that after TICKET-23 the static rotation is the **only** source, which makes the pin
      strictly more reliable than it was — no approved community phrase can shadow the date.
- [ ] **Play the round to completion** and assert the Round-End Result Panel appears. This is new
      scope, unlocked by the capability removal — ISSUE-03 records that end-of-round is
      browser-untested for *every* Game, and this is the cheapest place to start closing that.
- [ ] **Assert the two removed surfaces are absent**, so this spec is also the browser-level
      regression guard for ADR 0027: no 🏆 leaderboard control on the page or in the Result Panel, and no
      ➕ «Υποβολή Παζλ» button on the picker card for this Game. A browser test is the right place
      for this — a re-added button would be visible here and invisible to jsdom.
- [ ] Assert the Result Panel shows **no `πόντοι` heading** for this Game (ADR 0027 §3), and confirm
      by eye that a Game which *does* still score — Λεξοδρομία or Τοποθεσίες — is unchanged.

## Done when

`npm run test:e2e` passes with a new Vres Tin Frasi spec that fails if the page stops mounting, if
the keyboard stops reaching the reducer, if the Result Panel stops rendering at round end, or if
either removed control comes back. `npx eslint .` is clean, and **no new row appears in
`game_scores`** — now guaranteed by construction rather than by the test avoiding the ending, which
is worth confirming once with a live count before and after.

## Before you start

Read the `e2e cold-chunk flake` row in `.claude/aiHelper/memory.md`. A stale Turbopack chunk makes
`/` fail with `Runtime SyntaxError: Unexpected end of JSON input`, it **survives re-runs**, and the
spec passes in isolation while failing in the full suite. The fix is `Remove-Item -Recurse -Force
.next`, not running it again.

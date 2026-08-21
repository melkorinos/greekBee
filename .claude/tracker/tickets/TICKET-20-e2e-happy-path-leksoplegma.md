# Browser happy path for Leksoplegma

**Status:** ready
**Spec:** `.claude/aiHelper/e2e-coverage/analysis.md` §5 Tier A (A3), ISSUE-03

## Why

`/leksoplegma` is a launched Game with both capabilities and **no browser test loads
it at all**. It is also the only Game whose core input is a **pointer drag across a
grid**, which is the single interaction jsdom is least able to simulate honestly: the
unit tests fire synthetic events at components, while the real thing depends on hit
testing against laid-out geometry. If any Game's "works in tests, dead in the browser"
gap is real, it is this one.

It is deliberately the **last** of the five Tier A specs, because the drag is the
hardest input to make non-flaky and the other four establish the pattern first.

## Scope

- [ ] Add `e2e/pages/LeksoplegmaPage.ts` — locators for the `h1`, the board
      (`data-testid="game-board"`), the found-word counter, and a `traceWord()` helper
      that drags across cells using `page.mouse` (`move` → `down` → stepped `move`s →
      `up`) against the cells' bounding boxes. Steps matter: a single jump often
      misses intermediate cells.
- [ ] Register the fixture in `e2e/fixtures.ts`
- [ ] Add `e2e/leksoplegma.spec.ts` with one test: load, trace **one** hidden word,
      assert the found-word count increments
- [ ] **Pin the puzzle** with `?puzzle=YYYY-MM-DD` (a fixed past date) — the daily
      puzzle is a rotation over the committed generator batch, so a pinned date fixes
      the grid and lets the spec hardcode one word's cell path. Comment the word and
      its coordinates.
- [ ] If the drag proves flaky after a fair attempt, **do not paper over it with
      timeouts**. Fall back to whatever click-to-select path the board supports, and
      record in the spec header that the drag itself is still browser-unverified — an
      honest gap beats a green test that proves nothing.
- [ ] **Stop after one word — but that alone does NOT keep the round out of
      production.** This ticket said a *completed grid* fires score submission; it is
      wrong, and TICKET-19 hit the same wrong sentence. `LeksoplegmaBoard` posts
      through `useLiveScorePost`, which fires on **every score increase**, so tracing
      one word writes a row to the shared `game_scores` by itself. Do what
      `e2e/leksodromia.spec.ts` does: `page.route` the `POST /api/game-scores` to a
      stub, and **assert the stub fired**, so an interception that silently stops
      matching cannot pass while writing to production every run.

## Done when

`npm run test:e2e` passes with one new Leksoplegma test, run three times locally with
no flake, no new row appears in `game_scores`, and `npx eslint .` is clean.

# E2E coverage is seven tests across eight launching Games

**Deferred:** 2026-08-11
**Revisit when:** the first bug that reaches production is one a happy-path browser test would have
caught — or when a Game's page, layout or shared chrome is next reworked, whichever comes first.

## Problem

`npm run test:e2e` runs four spec files — `games`, `flows`, `profile`, `offlineMode` — with a
baseline of **7 passed, 2 skipped**. The two skipped are the Offline Mode acceptance tests, which
fail on purpose and are deliberately not a gate. So the real browser coverage of a Platform about
to show eight Games to strangers is seven tests.

`goals.md` item 6 has wanted happy-path coverage per Game for some time. It has never been sized.

Two things make the gap sharper than the number suggests:

- **The unit suite cannot substitute.** jsdom has no layout engine and no CSS. `reflections.md`
  records two live instances: the Shell header grew to four buttons with nothing able to catch a
  wrap at 320 px, and every badge visual gate passes with the marks rendering invisibly. Anything
  whose failure mode is "looks wrong" is invisible to everything except a real browser and a human.
- **It has already bitten.** A `getByRole("link")` guard in `e2e/profile.spec.ts` survived the
  header's Link→button change because Playwright runs only in CI — which is why `CLAUDE.md` now
  carries the standing rule to run `test:e2e` locally before calling a branch ready.

There is also a known flake that makes any expansion harder than it looks: a stale Turbopack chunk
makes `/` fail with `Runtime SyntaxError: Unexpected end of JSON input`, it **survives re-runs**, and
the spec passes in isolation while failing in the full suite. The distinguishing test is
`Remove-Item -Recurse -Force .next` followed by a re-run — not running it again. Anyone growing the
suite will meet this and should read the `e2e cold-chunk flake` row in `memory.md` first.

## Why deferred

Resolved on 2026-08-11 as part of the launch checklist: **the launch gate is the existing suite
green, not a bigger one.** The operator's reasoning — coverage is thin and does need to grow, but it
is one gate among several rather than the thing that decides a go/no-go, and there is no deadline
behind it.

Growing it properly means a happy-path spec per Game — eight new specs, each needing a stable
selector strategy against pages that the UI redesign may still move. Doing that now risks writing
selectors twice. TICKET-06 already forces one `games.spec.ts` edit for the eight-Game picker; that
is the extent of the work the launch justifies.

This flips when a production bug turns out to be browser-visible and unit-invisible. That is the
evidence that would make the cost worth paying, and none exists yet.

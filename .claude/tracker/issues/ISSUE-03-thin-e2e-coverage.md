# E2E coverage leaves most of the Platform browser-unverified

**Deferred:** 2026-08-11
**Revisit when:** TICKET-17, TICKET-19 and TICKET-20 have shipped — the three remaining
per-Game happy paths below are then the cheapest work left in this file, and it should
be re-read to decide whether they are worth ticketing.

## Problem

`npm run test:e2e` runs **15 tests across 5 spec files** — `games`, `flows`, `profile`,
`privacy`, `offlineMode` — of which 13 run and 2 are permanently skipped (the Offline
Mode acceptance tests, which fail on purpose and are deliberately not a gate). Against
that sit 213 unit/component test files.

The full breakdown of what those 13 tests do and do not guarantee is in
`.claude/aiHelper/e2e-coverage/analysis.md`, measured 2026-08-20. The headline facts:

- **6 of 11 registered routes are never loaded by any browser test.** All six are
  launched and unhidden; three of them still write to the shared database
  (Λεξοδρομία, Λεξόπλεγμα, Τοποθεσίες) — Βρες τη Φράση stopped being
  capability-bearing on 2026-08-20 (ADR 0027) without becoming any less launched.
- **Only 2 of 11 Games have a turn played in a browser** (Leksokipos, Leksiarxeio).
- **End of round is browser-untested for every Game** — the result panel, share panel,
  leaderboard modal and achievement toast are never opened by anything.
- Everything runs at Desktop Chrome 1280×720. There is no mobile viewport and no
  dark-mode pass, so the two failure modes `reflections.md` records as live — the Shell
  header wrapping at 320 px, and badges rendering invisibly — remain uncatchable.

Two things make the gap sharper than the number suggests:

- **The unit suite cannot substitute.** jsdom has no layout engine and no CSS. Anything
  whose failure mode is "looks wrong" is invisible to everything except a real browser.
- **It has already bitten.** A `getByRole("link")` guard in `e2e/profile.spec.ts`
  survived the header's Link→button change because Playwright ran only in CI — which is
  why `CLAUDE.md` now carries the standing rule to run `test:e2e` locally before calling
  a branch ready.

There is also a known flake that makes any expansion harder than it looks: a stale
Turbopack chunk makes `/` fail with `Runtime SyntaxError: Unexpected end of JSON input`,
it **survives re-runs**, and the spec passes in isolation while failing in the full
suite. The distinguishing test is `Remove-Item -Recurse -Force .next` followed by a
re-run — not running it again. Anyone growing the suite will meet this and should read
the `e2e cold-chunk flake` row in `memory.md` first.

## What has been carved out

On 2026-08-20 the operator took **three** per-Game happy paths out of this issue and
into tickets. Those are no longer deferred and are not described here any more:

TICKET-17 (Vres Tin Frasi), TICKET-19 (Leksodromia), TICKET-20 (Leksoplegma).

**TICKET-17 was rewritten on 2026-08-20** against ADR 0027, which revokes Vres Tin Frasi's `scores`
and `leaderboard` capabilities. Its old shape turned on avoiding a write to production `game_scores`
by stopping after one guess; with no write to avoid, the spec now plays a full round and asserts the
Result Panel — so it also becomes this file's first piece of end-of-round browser coverage. That
removal shipped the same day, so nothing blocks it. TICKET-19 and TICKET-20 are unaffected:
Leksodromia and Leksoplegma keep both capabilities, and their stop-after-one-word constraint holds.

Topothesies and Leksikastirio were ticketed the same day and withdrawn within the hour
as low priority — TICKET-18 and TICKET-21 are retired in the `SPENT` ledger and must
never be reused. Their work is back in the deferred list below.

The 2026-08-20 analysis found the cost lower than this issue originally assumed: every
testid a happy-path spec needs already exists in `src/games` / `src/components`, and
every daily Game accepts `?puzzle=YYYY-MM-DD`, so a spec can pin deterministic content
instead of depending on whatever rotates in that morning. What is missing is page
objects and specs, not instrumentation.

## What stays deferred, and why

- **Three per-Game happy paths**, all held back by the operator on 2026-08-20:
  - **Stavrolekso** — the one Game with a multi-route surface (`/stavrolekso`, `/[id]`,
    `/maker`) and a maker flow, so a single happy path would not represent it fairly.
  - **Topothesies** — one wrong region guess, asserting the silhouette renders and
    `shape-guesses` gains a row. Worth noting that its board is an inlined SVG
    (ADR 0018), which is exactly the kind of claim jsdom cannot make.
  - **Leksikastirio** — must be **read-only**: load, switch tabs, open and cancel the
    nomination modal. No vote and no submit; a vote is a real write that shapes the
    dictionary, and no test suite should be casting them.

  Consequence to be aware of: five routes currently have **zero** coverage of any kind
  in a browser. The shape of all three specs, and the `?puzzle=` pinning they need, is
  in the analysis document.
- **Breadth work** — a registry-driven smoke test over every `GAME_REGISTRY` href, the
  same table at a mobile viewport, and drawer-navigation coverage. Cheap and valuable,
  but the mobile half needs a second Playwright project, which roughly doubles run time
  for the specs it includes; that is a deliberate cost the operator has not yet taken.
- **End-of-round, leaderboard modal, profile against real API routes, offline outbox,
  dark mode.** All real gaps, all larger, and several of them write to the shared
  production database or need a seeded identity.
- **Un-skipping `offlineMode.spec.ts`** — blocked on the service worker ADR 0010 has
  twice declined. Not a test problem.

The original deferral reasoning still holds for everything above: the launch gate is
the existing suite green, not a bigger one, and no production bug has yet turned out to
be browser-visible and unit-invisible. That is still the evidence that would make the
remaining cost worth paying.

# `rlsInvariantsLiveDb` flakes under a full-suite run

**Deferred:** yes — it is a test-harness fragility, not a product defect, and it does not
reach CI (which runs without live-DB secrets by design, session 100).
**Revisit when:** a full-suite failure has to be trusted at a glance — most likely while
resolving launch-readiness open question 1, which decides whether the test suite is a
launch gate.

## What happens

`src/test/shared/rlsInvariantsLiveDb.test.ts` → *"blocks anon from DELETE-ing game_state rows"*
fails intermittently during `npm run test -- --run`, and **passes every time the file is run on
its own**. Observed 2026-08-07 while building TICKET-02: it failed in 2 of 4 full runs and in
0 of 3 isolated runs of that file.

It asserts a service-role-seeded `game_state` row survives an anon DELETE:

```
expect(count).toBe(1)
```

## Why it matters more than a normal flake

The same file legitimately reports **5 expected failures** until migration `20260807120000` is
pushed. An intermittent sixth failure in that same block is the worst possible place for noise:
the way anyone checks this suite is "are the failures exactly the 5 known ones?", and a drifting
count trains the reader to wave the whole block through. That is how a genuine RLS regression
gets missed.

## Likely cause (unverified)

Every `describe` in the file wipes its own sentinel rows in `beforeAll`/`afterAll`, and no other
test file uses the `__rls_` prefix — so it is probably not cross-file sentinel contention. More
likely: **one shared Supabase project backs dev, prod and the test run**, so a full suite drives
far more concurrent traffic at it than an isolated file does, and the seeded row's visibility
races the anon DELETE round-trip. Timing, not policy.

**Do not "fix" it by loosening the assertion.** The invariant it guards (anon cannot delete
game_state) is real and was closed deliberately by migration `20260716120100`. If it needs a
change, the direction is isolation — a per-test unique `device_uuid` like the sibling upsert test
already uses (`__rls_${crypto.randomUUID()}` computed *inside* the test rather than once per
describe), so no two runs of anything can touch the same row.

## First step when picked up

Reproduce with the count assertion widened to log the actual value, and check whether the row is
missing (a real delete — which would be alarming) or simply not yet visible (a race). Those two
answers point in opposite directions.

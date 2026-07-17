# The nomination dedup backstops are only ever tested against a mock, never the real DB

Status: ready-for-agent

Status: needs-triage

## The one-sentence version

The "one pending nomination per (word, direction)" and "one vote per (nomination, device)"
guarantees are enforced by two DB objects that no test asserts the existence of — every test proves
only that the *route handles a 23505 the mock was told to throw*, which would keep passing if the
constraints were dropped tomorrow.

## Status: currently correct (verified live 2026-07-17)

## Triage decisions (2026-07-17)

- **Approved:** the test may write sentinel rows to the production `nominations` tables, following
  `rlsInvariantsLiveDb.test.ts`'s sentinel + service-role cleanup pattern exactly.
- **Bundle the env-loading fix (issue 03) as step one** — the new live test proves nothing while
  vitest never loads `.env.local`; hook the env up (or verify 03's fix) before writing the test.

Queried `pg_indexes` on `rnfsuvhgufhbekodkmlp` — **both objects exist**:

```
nominations_pending_word_direction_key
  UNIQUE btree (word, direction) WHERE (status = 'pending'::text)
nomination_votes_nomination_device_unique
  UNIQUE btree (nomination_id, device_id)
```

So this is **not** an active bug — the migration
(`20260716120200_dedup_backstops_votes_and_pending_nominations.sql`) is applied and the 409
`already_pending` path in `route.ts:148-159` is reachable. This ticket is about the fact that
nothing *keeps* it that way.

## The gap

The dedup promise spans three layers, and the tests stop one layer short:

| Layer | Covered by | Real? |
|---|---|---|
| Client pre-check | `nominationModal.test.tsx:289-369` — pending banner, upvote pivot, 409 pivot | mock fetch |
| Route 23505 handling | `nominationsRoute.test.ts:250` (`409 already_pending`), `:432`/`:441` (vote races) | mock Supabase |
| **The constraint itself** | **nothing** | — |

Every row above mocks the layer below it. The route tests *inject* `code: "23505"` — that proves the
handler branches correctly given a violation, not that a violation ever occurs. If the partial index
were dropped, or its `WHERE status = 'pending'` predicate changed, or a future migration recreated
`nominations` without it, the full suite stays green and duplicate pending rows silently return —
which is exactly the failure the migration header says it exists to prevent ("enforced only by a
read-then-write in the route, so concurrent requests could land silent duplicates").

This is the same class of blind spot that `rlsInvariantsLiveDb.test.ts` was written for. Its header
(`:1-8`) makes the argument: *"RLS policies are invisible to mocked unit tests — only a live check
can prove…"*. It already carries a uniqueness invariant of exactly this shape — invariant #4,
`(game_id, device_id, puzzle_date) is unique (no duplicate leaderboard rows)`.

## Shape of the fix

Extend `rlsInvariantsLiveDb.test.ts` with a `nominations` describe block, following the file's
existing conventions rather than inventing new ones:

- Insert a pending nomination with a sentinel word, then insert the identical `(word, direction)`
  again → must fail with 23505. Same for two votes from one device on one nomination.
- Assert the partial predicate actually bites: an `accepted`/`rejected` row with the same
  `(word, direction)` **must** be allowed to duplicate — re-proposals after rejection are a deliberate
  feature per the migration comment, and a non-partial index would break them. This is the half most
  likely to regress silently, because nothing else notices.
- Reuse the file's safety pattern: sentinel values no real query reads, service-role cleanup in
  `beforeAll`/`afterAll`, `describe.skipIf(!canRun)` so it auto-skips without live keys.

Note the sentinel word must be normalised (`normalizeLetters`) to match how the route stores words,
or the test won't exercise the same key the index is built on.

## Caveat worth flagging during triage

This test writes to the **production** database — one Supabase project backs dev and prod. That is
already true of every test in this file, and the sentinel + cleanup pattern is what makes it
acceptable; follow it exactly.

## References

- `supabase/migrations/20260716120200_dedup_backstops_votes_and_pending_nominations.sql` — the two objects
- `src/test/shared/rlsInvariantsLiveDb.test.ts:1-22` — the precedent, its rationale and safety pattern
- `src/app/api/nominations/route.ts:148-159` — the 409 path that depends on the index firing
- `src/test/shared/nominationsRoute.test.ts:250` — the mocked 23505 that can't see the constraint

# Handoff — two check-then-act dedup flows have no DB backstop (votes + pending nominations)

**Status:** ready-for-agent
**Created:** 2026-07-16 (DB review). Second half is the **deliberately deferred "Option A"** from
session 86 — deferred then to avoid a prod schema change, queued now.

## The one-sentence version

Both places the app promises "one per device/word" enforce it with a read-then-write in the route
and nothing in the database — `nomination_votes` has no `UNIQUE (nomination_id, device_id)`, and
`nominations` has no partial unique index on pending rows — so races and multi-device duplicates
land silently.

## The evidence

- **Votes** (`/api/nominations/[id]/vote`): the toggle does `.maybeSingle()` on
  (nomination_id, device_id), then inserts if "no vote". Two concurrent requests both see
  no-vote and both insert. Worse, the failure **compounds**: once 2 rows exist, `maybeSingle()`
  errors on multiplicity, `existing` resolves null, and the next toggle inserts a *third* row —
  the undo/switch path becomes unreachable for that device, and vote counts inflate.
- **Nominations**: session 86 proved bursts are real in prod (`αγοραροσ` ×6 byte-identical rows
  in 32 ms from one held Enter key). The client-side `busyRef` lock fixed the single-tab case;
  the session log explicitly notes the DB index is "the only thing that stops dupes from two
  devices/tabs" and defers it.
- **Applies cleanly today, verified live 2026-07-16:** zero duplicate (nomination_id, device_id)
  vote pairs; zero duplicate pending (word, direction) nominations. Re-run both GROUP BY/HAVING
  checks immediately before applying — a unique index is rejected outright if rows violate it.

## Shape of the fix

1. One migration:
   - `ALTER TABLE nomination_votes ADD CONSTRAINT nomination_votes_nomination_device_unique
     UNIQUE (nomination_id, device_id);`
   - `CREATE UNIQUE INDEX nominations_pending_word_direction_key ON nominations (word, direction)
     WHERE status = 'pending';`
2. Route handling for the new 23505s:
   - Vote route: on insert conflict, treat as "vote already exists" (re-read and toggle, or
     return the current state) — not a 500. Also stop the compounding: a multiplicity error from
     `maybeSingle()` must not fall through to insert.
   - Nominations POST: map 23505 onto the **existing** "already pending → vote for it instead"
     flow (the route already has that concept for the lookup path — session 86).
3. Note on normalization: nomination words are stored normalized as of session 86, so the partial
   index keys on the normalized form. Only *pending* rows participate; the older non-normalized
   rows are all accepted/rejected and can't collide.

## Guardrails

- Migration file + `npx supabase db push`; the `20260715120000` history repair must happen first
  (see deploy-runbook handoff).
- Shared dev/prod: run the pre-flight duplicate checks the same day you push.
- Gates: `npm run test -- --run`, `npx eslint .`, `npm run build`; `tsc --noEmit` 24-error
  baseline applies.

## Files

- `supabase/migrations/` — the two indexes
- `src/app/api/nominations/[id]/vote/route.ts` — toggle logic + 23505 handling
- `src/app/api/nominations/route.ts` — POST 23505 → pending-upvote flow
- `.claude/aiHelper/log.md` session 86 — the deferral this executes

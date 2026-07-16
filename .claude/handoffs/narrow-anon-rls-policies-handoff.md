# Handoff — ADR 0013's "immutable" fact rows are anon-deletable: narrow the three ALL-true policies

**Status:** ready-for-agent
**Created:** 2026-07-16 (DB review; verified against live `pg_policies` + a client-usage sweep)

## The one-sentence version

`player_achievements` and `player_pangrams` — the "immutable earned-fact rows" of ADR 0013 — and
`game_state` all carry RLS `anon ALL USING (true) WITH CHECK (true)`, so one curl with the public
anon key can UPDATE or **DELETE every row table-wide**; the app's anon paths only ever use a
subset of those commands, so the surplus grants protect nothing and can be dropped with zero
product impact.

## What each table actually needs from anon (verified 2026-07-16)

| Table | Anon paths in the app | Needed | Currently granted |
|---|---|---|---|
| `player_achievements` | `/api/achievements` GET (select) + POST (insert) | SELECT, INSERT | ALL |
| `player_pangrams` | `/api/pangrams` insert-if-absent + stats reads | SELECT, INSERT | ALL |
| `game_state` | `/api/game-state` GET (select) + POST (upsert = insert+update) | SELECT, INSERT, UPDATE | ALL |

Deletes on all three happen only server-side with the service-role client (Sign-in Restore merges
in `/api/auth/link`; the retention cron in `/api/cleanup-scores`) — service role bypasses RLS, so
narrowing anon changes nothing for them. Before writing the migration, re-verify with a grep that
no hook/component calls `.delete()`/`.update()` on these tables through the anon singleton (this
review swept `src/app/api/`; sweep `src/hooks` + `src/lib` too).

## Why bother at current scale

The recorded accepted risk (reflections.md, "API rate limiting") is about **INSERT spam** —
monitor row counts, revisit at DAU ~500. Blanket DELETE is a different class: it silently
contradicts ADR 0013's central design claim (append-only earned facts) and makes the trophy/
pangram history erasable by anyone, not just spammable. The fix is one small migration and
removes the worst outcome (irreversible mass deletion) while deliberately keeping the open-write
posture that is a real decision.

## Explicitly out of scope — do not "fix" these

- **`game_scores`** open INSERT/UPDATE: recorded decision (migration `20260704120000` comment,
  ADR 0012 §6). Leave it.
- **`nomination_votes`** permissive UPDATE/DELETE: the vote route genuinely toggles/undoes via
  the anon client. Narrowing means moving that route to the service role first — fine as an
  optional follow-up, not this task.
- **`transfer_codes`**: separate handoff (`transfer-codes-hardening-handoff.md`) — different
  threat, different fix.
- `nominations`, community tables, `player_profiles`: already per-command / scoped.

## Shape of the fix

1. One migration: for each of the three tables, `DROP POLICY "anon access"` and create
   per-command policies per the table above (keep the permissive `true` expressions — the point
   is removing *commands*, not scoping rows; there is no auth context to scope by).
2. Regression: extend `src/test/shared/rlsInvariantsLiveDb.test.ts` — anon DELETE on each table
   affects 0 rows (sentinel-row pattern already established there); anon upsert on `game_state`
   still works (the app's restore path must not break).
3. Update the two places that document the old posture as by-design: the advisor-baseline note in
   `.claude/skills/project-mcp/SKILL.md` (three `rls_policy_always_true` WARNs disappear) and
   ADR 0013 (a one-line amendment: DB now enforces append-only against anon).

## Guardrails

- Migration file + `npx supabase db push` — history repair for `20260715120000` must happen first
  (see deploy-runbook handoff) or push fails.
- Shared dev/prod project: the migration is instant-prod. It only *removes* grants the app
  doesn't use, so the blast radius is "something undiscovered was deleting via anon" — which is
  exactly what the pre-migration grep is for.
- Gates: `npm run test -- --run`, `npx eslint .`, `npm run build`; `tsc --noEmit` 24-error
  baseline applies.

## Files

- `supabase/migrations/` — the narrowing migration
- `src/app/api/achievements/route.ts`, `src/app/api/pangrams/route.ts`,
  `src/app/api/game-state/route.ts` — the anon consumers (no code change expected)
- `src/test/shared/rlsInvariantsLiveDb.test.ts` — regression home
- `docs/adr/0013-achievements-immutable-earned-fact-rows.md` — gets the amendment

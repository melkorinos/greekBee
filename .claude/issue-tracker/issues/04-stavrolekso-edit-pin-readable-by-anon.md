# Stavrolekso `edit_pin` is readable by anyone holding the public anon key

Status: ready-for-agent

## The one-sentence version

`community_stavrolekso_puzzles` grants anon `SELECT` over **all columns**, so the public anon key
shipped to every browser can read every pending puzzle's `edit_pin` straight from PostgREST —
which defeats the PIN gate that ADR 0005 relies on as the creator-edit flow's only authorisation.

## The evidence

Verified live against prod on 2026-07-16. Seeded a pending row with a known PIN via the service
role, then read it back with the **anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, public by design):

```
GET /rest/v1/community_stavrolekso_puzzles?title=eq.__pin_probe__&select=id,title,edit_pin
→ {"id":3,"title":"__pin_probe__","edit_pin":"SECRET-9999"}
```

The PIN comes back in plaintext. No admin secret, no auth — just the key that is in every page's
JS bundle. Probe row was wiped afterwards (0 rows left).

The policy behind it (`supabase/migrations/20260628101701_baseline_remote_schema.sql:620`):

```sql
CREATE POLICY "anon select" ON public.community_stavrolekso_puzzles FOR SELECT TO anon USING (true);
```

`USING (true)` with no column restriction — RLS has no column-level filtering, so a table-wide
SELECT policy exposes `edit_pin` alongside the public browse columns.

## Why this matters

The PIN **is** the authorisation for the creator-edit flow. Anyone can therefore enumerate pending
puzzles, harvest the PINs, and edit any of them through the legitimate route — the server-side PIN
check passes, because they hold a genuine PIN.

Note the fix for the sibling bug (the silent edit no-op, fixed 2026-07-16) does **not** close this.
That one moved the UPDATE to the service role so real edits persist; the write path is now correct
and privileged. This is the read side: the secret that gates that write path isn't secret.

Severity is bounded today only by the table being near-empty and Stavrolekso being pre-launch. It
does not self-resolve — it gets worse the moment creators start submitting.

## Shape of the fix

The constraint: the browse/GET path genuinely needs anon SELECT on the public columns
(`id, title, submitter_name, data, status, created_at`), and RLS cannot filter columns. So the PIN
has to stop being reachable by anon at all.

**Recommended — drop anon SELECT to a column-safe surface:**

1. `REVOKE SELECT ON public.community_stavrolekso_puzzles FROM anon;` and re-grant only the public
   columns: `GRANT SELECT (id, title, submitter_name, data, status, created_at) ON … TO anon;`
   Postgres column-level grants *do* apply where RLS can't, and PostgREST honours them.
2. The PATCH route's PIN lookup already needs `edit_pin`, so move that `.select("status, edit_pin")`
   onto `getServiceRoleClient()` — same reasoning as the UPDATE next to it in the same handler.
3. Verify the GET/list/browse paths still work on anon (they only touch the granted columns).

**Alternative** (bigger, cleaner long-term): move `edit_pin` out to a side table with no anon grant
at all, or behind a `SECURITY DEFINER` RPC that takes a PIN and returns a boolean — never the PIN.
Prefer this if PIN handling grows any further (rotation, attempt limits).

**Do not** "fix" it by relying on the route's `.select()` column list. That constrains only this
app's own query; a direct PostgREST call picks its own columns, which is exactly the probe above.

## Guardrails

- Schema change → **new migration file** in `supabase/migrations/`, applied with `npx supabase db push`.
  Never via the dashboard or MCP `apply_migration` without committing the matching file.
- One Supabase project backs dev **and** prod — every write is a production write.
- Lock it down with a regression test in `src/test/shared/rlsInvariantsLiveDb.test.ts`, which now
  covers this table's posture (anon UPDATE blocked, service-role UPDATE allowed). Add: anon SELECT
  of `edit_pin` must fail/return no PIN. **Heads-up:** that suite is `describe.skipIf(!canRun)` on
  env vars and vitest never loads `.env.local`, so it silently skips even locally — see issue 03.
  Load the env explicitly when verifying, or the new lock proves nothing.
- Gates: `npm run test -- --run`, `npx eslint .`, `npm run build`. `npx tsc --noEmit` has a
  pre-existing 24-error baseline in 6 test files — diff, don't expect zero.

## References

- `supabase/migrations/20260628101701_baseline_remote_schema.sql:620` — the `anon select` policy
- `src/app/api/community-puzzles/stavrolekso/[id]/route.ts` — PIN lookup (anon) + UPDATE (service role)
- `src/test/shared/rlsInvariantsLiveDb.test.ts` — where the regression lock belongs
- `docs/adr/0005-stavrolekso-edit-pin-auth.md` — the design this protects
- `.claude/issue-tracker/issues/03-unit-tests-never-run-in-ci.md` — why the live-DB lock needs care

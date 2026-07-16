# Handoff — transfer_codes is a device_uuid oracle: anyone with the anon key can read every code

**Status:** ready-for-agent
**Created:** 2026-07-16 (DB review; verified against live `pg_policies`)

## The one-sentence version

`transfer_codes` has RLS `anon ALL USING (true) WITH CHECK (true)`, so the public anon key —
shipped to every browser — can `SELECT * FROM transfer_codes` via PostgREST and read **both the
active codes and the device_uuids they map to**, defeating the entire point of a transfer code
being a short-lived secret.

## Why this matters more than the open leaderboard

The platform's trust model deliberately accepts open writes on `game_scores` ("scores are not a
security boundary", ADR 0012 §6, migration `20260704120000`). Transfer codes are different in
kind: `device_uuid` is the platform's de-facto bearer credential — knowing one lets you post
scores as that player, rename their profile (when not auth-linked), and read their `game_state`.
Everywhere else device_uuids are unguessable UUIDs never enumerable by anon. This table is the
one place the mapping leaks. Exposure is bounded (rows exist only while a transfer is pending —
0 rows today; 24 h expiry; 10-day cron prune) but the fix is cheap and closes the class.

Two smaller defects in the same flow, worth fixing in the same pass:

1. **Non-atomic claim** (`/api/transfer/claim`): check `used`/`expires_at`, *then*
   `.update({ used: true })`. Two devices claiming simultaneously both pass the check. Single-use
   should be enforced by the write: `UPDATE … SET used = true WHERE code = ? AND used = false AND
   expires_at > now()` returning the row (`.eq("used", false).gt("expires_at", …).select()`), and
   404/410 on empty.
2. **`Math.random()` code generation** (`/api/transfer`): not cryptographically strong. Edge
   runtime has `crypto.getRandomValues` — use it. (32-char alphabet × 6 ≈ 2^30; fine with a real
   RNG and short expiry.)

## Shape of the fix

1. Switch both routes — `/api/transfer` (POST) and `/api/transfer/claim` (POST) — to
   `getServiceRoleClient()`. They are server-only edge routes; nothing client-side touches this
   table directly (verify with a repo grep for `transfer_codes` before relying on that).
2. New migration: `DROP POLICY "anon access" ON public.transfer_codes;` and add **nothing** for
   anon — server-only table, deny-by-default (the `identity_audit` pattern). RLS stays enabled.
3. Atomic claim + crypto RNG per above. Player-facing Greek error copy in claim responses must
   stay `jsonMessage` verbatim (useProfile renders it — see the route's header comment).
4. Regression: extend `src/test/shared/rlsInvariantsLiveDb.test.ts` — anon SELECT on
   `transfer_codes` returns zero rows even when a (service-role-inserted) sentinel row exists.
5. This intentionally shrinks the documented advisor baseline (one fewer `rls_policy_always_true`
   WARN): update the "advisor baseline" note in `.claude/skills/project-mcp/SKILL.md` and the
   rate-limiting entry in `.claude/aiHelper/reflections.md` if it references transfer codes.

## Guardrails

- Schema change → migration file + `npx supabase db push` (see the deploy-runbook handoff for the
  history-repair prerequisite; do that first or push fails on the unrecorded index migration).
- One shared project = prod. The policy drop is safe for the app only **after** the routes are on
  the service-role client — ship code and migration together (code first is harmless: service
  role bypasses RLS regardless).
- Gates: `npm run test -- --run`, `npx eslint .`, `npm run build`; `tsc --noEmit` has the known
  24-error baseline.

## Files

- `src/app/api/transfer/route.ts` — generate (anon client, Math.random)
- `src/app/api/transfer/claim/route.ts` — claim (anon client, check-then-set)
- `supabase/migrations/` — the policy-drop migration lands here
- `src/test/shared/rlsInvariantsLiveDb.test.ts` — regression home
- `docs/adr/0012-signin-restore-adopts-device-identity.md` — the trust-model line this sharpens

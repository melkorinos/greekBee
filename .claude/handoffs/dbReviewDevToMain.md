# Handoff — DB story from the dev→main pre-deploy review (2026-07-04)

Context: reviewing the `dev` → `main` (production) merge before deploy, focused on DB + auth.
Tonight's merge turned out to be **code-only** — see below.

## 1. Shared dev/prod Supabase database (the headline)

There is **one** Supabase project for the whole account: `rnfsuvhgufhbekodkmlp`
(`melkorinos's Project`, eu-central-1). Both `.env.local` and Vercel point at it — **no
separate production DB.** Persisted as memory `shared-dev-prod-database.md`.

Consequences (verified live via MCP `execute_sql`, not the local CLI — repo is not `supabase link`ed):
- `db push` / migrations apply to prod the instant they run, decoupled from the Vercel code deploy.
- Dev testing (e2e, manual Google runs) writes to the same tables real users use.
- No isolation buffer — a bad dev migration hits prod immediately.

## 2. The three new migrations were already applied — "ordering risk" was moot

Files: `supabase/migrations/2026062900001…`, `…20260703092500…`, `…20260704120000…`.
`list_migrations` shows all four (baseline + 3) recorded and in sync. Live schema confirmed:
- `game_scores` columns = `id, game_id, puzzle_date, device_id, display_name, score, data, is_perfect`
  → `is_perfect` **present**, `auth_user_id` **already dropped**.
- `identity_audit` table **exists** (RLS on, zero policies — service-role writes only; advisor flags it INFO, intended).

So the original red items (migration ordering, baseline sync, prod env vars) are all closed.
Env vars (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) are already exercised by current prod code.

## 3. Current prod is code-vs-schema mismatched — tonight's deploy REPAIRS it

Because the schema is already migrated but `main` still runs the old code:
- The live `main` `/api/auth/link` back-fills `game_scores.auth_user_id` (a dropped column)
  → those writes error **right now** (non-fatal `console.error`; profile linking still works).
- New `dev` code no longer touches `game_scores` in the link route → deploy closes the gap.

**Implication: deploy sooner, not later.** Risk is inverted — the deploy fixes a live mismatch
rather than introducing schema risk.

## 4. Residual auth threat model — device_uuid as bearer secret

`/api/auth/link` (new code) correctly derives `auth_user_id` from the verified JWT, but still
trusts `device_uuid` from the request body with **no proof-of-possession**. An authenticated
caller who obtains a victim's `device_uuid` can trigger `restore()` → re-point/delete that
device's scores and delete its `player_profiles` row.

- Bounded by: `device_uuid` is a random UUID, **never returned in third-party reads** (verified —
  leaderboard GET omits `device_id`).
- Already documented as an accepted consequence in `docs/adr/0012-signin-restore-adopts-device-identity.md`
  (point 1 = possession is identity; Consequences line 33 = destructive link-time events + `identity_audit`
  reconstruction net). No runtime fix exists without changing the identity model.
- Accepted RLS posture: `scores_update USING(true)` is intentional (ADR §6 / amendment line 32,
  "scores are not a security boundary"). Advisor WARN is expected.

## 5. Open follow-ups

- [ ] **Decision: split dev/prod environments?** Structural, not a tonight blocker. The shared DB is
      the biggest standing risk. Options to weigh: separate Supabase project for prod vs. a preview/branch DB.
- [ ] **Optional: ADR 0012 §6 one-liner** — state explicitly that `device_uuid` is a bearer secret trusted
      from the request body, bounded by never being leaked in reads. (Everything else is already there.)
- [ ] **Post-deploy: one real Google sign-in on the prod domain.** PKCE flow change
      (`flowType:"pkce", detectSessionInUrl:false` in `src/lib/supabase.ts`, the "google auth fixed" commit)
      is the highest regression surface; callback redirect URIs are env-specific and unverifiable from the diff.

## Not covered here (see source of truth)
- Full feature diff (Profile Page, Trophy Case, validateSubmission suites) — `git diff origin/main...dev`.
- Migration rationale — the migration files' own header comments.
- Identity/restore design — ADR 0012.

## Suggested skills for the next session
- `/aihelper` — reload full project context before acting.
- `/grill-with-docs` — if pursuing the split-environments decision, stress-test it against CONTEXT.md/ADRs.
- `/diagnose` — if the post-deploy Google sign-in test fails.

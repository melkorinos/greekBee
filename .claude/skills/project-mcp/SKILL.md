---
name: project-mcp
description: Canonical Supabase & Vercel MCP identifiers, call recipes, and known param-traps for this project (Greek Word Games / greek-bee). Use BEFORE any Supabase or Vercel MCP call — logs, tables, SQL, advisors, deployments, runtime errors/logs, build logs, migrations, keys — so you skip the discovery thrash (Supabase erroring "project_id undefined", Vercel list_projects returning empty, build-logs 404) and call the right tool with the right IDs on the first try. Invoke as /project-mcp.
---

# project-mcp — Supabase & Vercel MCP quick reference

**One project, one org, one team. Do NOT run discovery — pass the IDs below on every call.**
All IDs verified live against the MCP servers.

## Identifiers (authoritative)

| | Supabase | Vercel |
|---|---|---|
| **Project** | ref `rnfsuvhgufhbekodkmlp` ("melkorinos's Project") | slug `greek-bee` · id `prj_HNH0oGZw3o7taDayCAtVe7BViOFl` |
| **Org / Team** | org `sulbdffdxbplnrosytmv` ("melkorinorg") | team `melkorinos-projects` · id `team_AUMxvbaDutPq8SMboMcf4sED` |
| **Region / stack** | `eu-central-1` · Postgres 17 | `fra1` · Next.js · Node 24.x |
| **URL** | `https://rnfsuvhgufhbekodkmlp.supabase.co` | `https://greek-bee.vercel.app` |
| **Source** | — | GitHub `melkorinos/greekBee` (public) · prod ← `main`, previews ← `dev` |

- **Every Supabase MCP tool** requires `project_id: "rnfsuvhgufhbekodkmlp"`.
- **Every Vercel MCP tool** requires `teamId: "team_AUMxvbaDutPq8SMboMcf4sED"` **and** `projectId` (slug `greek-bee` works for most).

## Param traps (this is why sessions thrash — memorise these three)

1. **Supabase tools HARD-FAIL without `project_id`.** Omit it → `ZodError: project_id … expected string, received undefined`. It is *not* inferred. Always pass it.
2. **Vercel `list_projects` returns `[]`** even though `greek-bee` exists — the list endpoint lies. **Never use it.** Go straight to `get_project { projectId: "greek-bee", teamId }`.
3. **Vercel `get_deployment_build_logs` needs the concrete `dpl_…` id, NOT the alias.** Passing `greek-bee.vercel.app` → `404 Deployment not found`. Get the id first from `get_project.latestDeployment.id` or `list_deployments`, then pass that. (Note: `get_deployment` *does* accept the alias — inconsistent, but true.)

So **skip all discovery calls** — `list_projects` / `list_organizations` / `list_teams` — you already have every ID.

## Verified project facts (so you don't re-derive)

- **12 tables, all RLS-enabled** (`public.` schema): `game_scores` (~120), `game_state` (~93), `nominations`, `nomination_votes`, `player_profiles`, `player_achievements` (newest, migration `20260706093000`), `transfer_codes`, `identity_audit`, and 4 `community_*_puzzles`.
- **No Supabase Edge Functions** — server logic is Next.js API routes on Vercel. Don't hunt for edge functions.
- **Keys:** legacy anon JWT + publishable `sb_publishable_DzrXPPJlqRlQshOccwnlBg_n3IFkEy8` (both enabled).
- **Advisor baseline is noisy but expected** — `get_advisors security` returns ~15 lints that are BY DESIGN: permissive anon-`INSERT`/`ALL` policies (public write is intentional — `game_state`, `player_achievements`, `nominations`, community tables), `identity_audit` RLS-enabled-no-policy, auth leaked-password-protection off. **Don't treat these as regressions.** `get_advisors performance` is clean.

## Happy-path recipes

**"Is prod healthy?"** → `get_project { projectId: "greek-bee", teamId }` → check `latestDeployment.readyState == "READY"`. Then `get_runtime_errors` (pre-aggregated, fast) → `get_runtime_logs { group_by: "statusCode" }`.

**"Why did the build fail?"** → `list_deployments` → grab the failing `dpl_…` → `get_deployment_build_logs { idOrUrl: "<dpl_…>", errorsOnly: true }`.

**Supabase inspect/debug (read-only, allowlisted):** `list_tables`, `list_migrations`, `execute_sql` (SELECT), `get_advisors { type }`, `get_logs { service }` — services: `api | postgres | auth | storage | realtime | edge-function | branch-action`. All with `project_id`.

## Guardrails (from CLAUDE.md — read before any write)

- **One Supabase project backs BOTH dev and prod.** Every write is production. `execute_sql` (writes), `apply_migration`, Vercel `deploy_*` prompt — treat as prod-affecting.
- **Never change schema via MCP `apply_migration` or the dashboard.** DDL is version-controlled in `supabase/migrations/`; add a `.sql` file and apply with `npx supabase db push --db-url <SUPABASE_DB_URL>` (no Docker), or the repo drifts.
- **Never prune `game_scores`** (lifetime substrate). Only `game_state` is prunable.
- Read-only MCP calls are allowlisted; mutating ones prompt — expected, not misconfig.

## Scope

Project infra is **Supabase + Vercel only**. The Gmail / Google Drive MCP servers are personal claude.ai integrations, **not project infrastructure**. GitHub is via the `gh` CLI, not MCP.

**Google auth is NOT a Google MCP.** The project's Google sign-in is Supabase Auth's Google OAuth *provider* — configured manually in Google Cloud Console + the Supabase dashboard (see `docs/google-oauth-setup.md`), with runtime code in `src/lib/supabase.ts` (`signInWithOAuth`). There is no Google Cloud MCP, and the Gmail/Drive MCPs cannot touch the OAuth client. To debug sign-in, use Supabase `get_logs { service: "auth" }`, not any Google tool.

## When this is wrong

If an ID here stops matching reality (rename, team migration), re-derive once — Vercel `get_project`, Supabase `list_projects` — then **update this file** and continue. Fixing the drift here, not rediscovering every session, is the whole point of the skill.

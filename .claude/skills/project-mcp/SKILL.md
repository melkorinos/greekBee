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
| **Plan** | free tier | **Pro** (since ~2026-07-14, $200/mo on-demand cap) |

- **Every Supabase MCP tool** requires `project_id: "rnfsuvhgufhbekodkmlp"`.
- **Every Vercel MCP tool** requires `teamId: "team_AUMxvbaDutPq8SMboMcf4sED"` **and** `projectId` (slug `greek-bee` works for most).

## Param traps (this is why sessions thrash — memorise these three)

1. **Supabase tools HARD-FAIL without `project_id`.** Omit it → `ZodError: project_id … expected string, received undefined`. It is *not* inferred. Always pass it.
2. **Vercel `list_projects` returns `[]`** even though `greek-bee` exists — the list endpoint lies. **Never use it.** Go straight to `get_project { projectId: "greek-bee", teamId }`.
3. **Vercel `get_deployment_build_logs` needs the concrete `dpl_…` id, NOT the alias.** Passing `greek-bee.vercel.app` → `404 Deployment not found`. Get the id first from `get_project.latestDeployment.id` or `list_deployments`, then pass that. (Note: `get_deployment` *does* accept the alias — inconsistent, but true.)

So **skip all discovery calls** — `list_projects` / `list_organizations` / `list_teams` — you already have every ID.

## Vercel MCP absent? Use the CLI (verified 2026-07-14)

Some sessions have **no Vercel MCP tools at all** (ToolSearch finds none — only Supabase/Gmail/Drive are connected). Don't hunt; fall back to the Vercel CLI, which covers most of the same ground:

- `npx vercel whoami` — if not logged in, it starts a device-code flow (user visits vercel.com/oauth/device); account `melkorinos`. Credentials then persist on this machine.
- Always pass `--scope melkorinos-projects`.
- `npx vercel ls greek-bee [--prod]` — deployments list (works fine, unlike MCP `list_projects`).
- `npx vercel inspect <url-or-dpl_id>` — deployment metadata (accepts alias or id; gives `dpl_…`, created time, aliases).
- `npx vercel inspect <dpl_id> --logs` — full build logs incl. the Next.js route table. **Writes to stderr** — run via Bash with `2>&1` redirect into a file; PowerShell `2>$null` eats it (0 lines).
- `npx vercel logs greek-bee.vercel.app --json` — **live-streams runtime logs from now** (no lookback); wrap in `timeout N …` via Bash to sample a window. Rows have `source` (`static`/`edge-function`/`lambda`), `requestPath`, `cache`, `responseStatusCode`.
- **Not available via CLI or MCP:** per-function CPU, Fluid gauge, billing-cycle reset date — Observability → Functions in the dashboard remains the only source; ask the operator.

## Environment variables — CLI only (verified 2026-07-16)

There is **no Vercel MCP tool for env vars** (ToolSearch finds none — `get_project`/`deploy_*`/logs only). Manage them with the CLI, always `--scope melkorinos-projects`:

- **The repo is NOT `vercel link`ed** (`.vercel/` is gitignored). `vercel env`/`redeploy` need project context or they go interactive. Link non-interactively by writing `.vercel/project.json` yourself — no prompt, no network:
  ```
  {"projectId":"prj_HNH0oGZw3o7taDayCAtVe7BViOFl","orgId":"team_AUMxvbaDutPq8SMboMcf4sED"}
  ```
  (Vercel's `orgId` **is** the team id. The dir is gitignored, so it never pollutes the tree.)
- `vercel env ls [production|preview] --scope melkorinos-projects` — lists names + which environments, **values shown as `Encrypted`** (never the plaintext).
- **Updating a value = rm then add** (no in-place edit): `vercel env rm NAME <env> --yes` then `printf 'value' | vercel env add NAME <env>`. Pipe the value via stdin with `printf` (no trailing newline). A var can target multiple environments as ONE entry — removing `production` may drop the whole entry (its `preview` target then reports `env_not_found`); re-add each environment you want explicitly.
- **New vars are created `Sensitive` by default → the value CANNOT be read back**, not even via `vercel env pull` (the pulled `.env` line is present but empty). Do **not** try to verify a secret by pulling — you'll see length 0 and misread it as "unset". Verify by exercising the deployed endpoint instead.
- **Env changes are captured at BUILD time — they do NOT affect the running deployment.** A change goes live only on the **next deployment**: `vercel redeploy <prod-url-or-dpl_id> --scope …` (rebuilds current source with the new env), or piggyback on the next `main` deploy. Until then, prod keeps the old value. (This is why a freshly-set secret still 403s until a redeploy.)
- `ADMIN_SECRET` gates the leksikastirio admin review routes (nominations approve/reject: JSON body `adminSecret`; community puzzles: `X-Admin-Secret` header) — both compared to `process.env.ADMIN_SECRET`. The `?godmode=zzkdgr3` URL param is a **client-only Leksokipos cheat** (hardcoded in `GameBoard.tsx`, never server-validated); it only doubles as an admin unlock when `ADMIN_SECRET` happens to equal it. Leksikastirio's `isAdmin` is just `param.length > 0`, so it shows approve/reject buttons for ANY value — they 403 unless the value matches `ADMIN_SECRET`.

## Verified project facts (so you don't re-derive)

- **12 tables, all RLS-enabled** (`public.` schema): `game_scores` (~120), `game_state` (~93), `nominations`, `nomination_votes`, `player_profiles`, `player_achievements` (newest, migration `20260706093000`), `transfer_codes`, `identity_audit`, and 4 `community_*_puzzles`.
- **No Supabase Edge Functions** — server logic is Next.js API routes on Vercel. Don't hunt for edge functions.
- **Keys:** legacy anon JWT + publishable `sb_publishable_DzrXPPJlqRlQshOccwnlBg_n3IFkEy8` (both enabled).
- **Advisor baseline is noisy but expected** — `get_advisors security` returns ~15 lints that are BY DESIGN: permissive anon-`INSERT`/`ALL` policies (public write is intentional — `game_state`, `player_achievements`, `nominations`, community tables), `identity_audit` RLS-enabled-no-policy, auth leaked-password-protection off. **Don't treat these as regressions.** `get_advisors performance` is clean.

## Happy-path recipes

**"Is prod healthy?"** → `get_project { projectId: "greek-bee", teamId }` → check `latestDeployment.readyState == "READY"`. Then `get_runtime_errors` (pre-aggregated, fast) → `get_runtime_logs { group_by: "statusCode" }`.

**"Why did the build fail?"** → `list_deployments` → grab the failing `dpl_…` → `get_deployment_build_logs { idOrUrl: "<dpl_…>", errorsOnly: true }`.

**Supabase inspect/debug (read-only, allowlisted):** `list_tables`, `list_migrations`, `execute_sql` (SELECT), `get_advisors { type }`, `get_logs { service }` — services: `api | postgres | auth | storage | realtime | edge-function | branch-action`. All with `project_id`.

## Applying migrations via MCP — the two gotchas (verified 2026-07-15)

The sanctioned path stays `npx supabase db push` (keeps migration-history in sync). But when you *do* apply via MCP (user-authorised), two things bit and will bite again:

1. **`apply_migration` can 502 while `execute_sql` works.** On 2026-07-15 `apply_migration` returned Cloudflare `502 origin_bad_gateway` (retryable) on every attempt, yet read-only *and* write `execute_sql` calls to the same project succeeded seconds apart — the mutating-migration origin path was specifically unhealthy, not the whole server. **Fallback:** run the DDL through `execute_sql` with `CREATE INDEX IF NOT EXISTS` / idempotent guards. Same DB state; no bogus migration-history row (see #2). On any 502, **first re-run a read-only check** (`SELECT … FROM pg_indexes …`) to see whether the failed write actually landed before retrying — a blind retry of bare `CREATE INDEX` errors "already exists".
2. **MCP-applied DDL never records the file's version in migration history.** Neither `apply_migration` (invents its own version) nor `execute_sql` (records nothing) writes the `20260715120000`-style version your committed `supabase/migrations/*.sql` file carries. So a later `npx supabase db push` sees that file as un-applied and re-runs it → `index already exists`. One-time fix when you next push: `supabase migration repair --status applied <version>`. The *schema itself* is correct — only the CLI bookkeeping drifts. Always keep the committed `.sql` file as the authoritative record regardless.

**Data migrations that flip stored-value semantics must land WITH the code deploy, never before** — e.g. the Vres Tin Frasi attempt-count→points flip (ADR 0014): inverting live rows while old code still posts the old shape corrupts the leaderboard until deploy. Hold such migrations until the code is live.

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

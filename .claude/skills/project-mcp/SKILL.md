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
4. **🔴 The Vercel MCP connector has NO project scope — every project-scoped call fails (measured 2026-08-12, s150).** `list_teams` returns the team fine, so the connector *is* authenticated and the failure does not look like an auth problem. But `get_project` → **404 Not Found** (with the slug *and* with the `prj_…` id), `get_runtime_errors` / `get_runtime_logs` → **403 Forbidden**, and `list_projects` → `[]`. Re-running the claude.ai authorization flow did **not** fix it. **Do not burn a session re-authorizing or re-deriving IDs — the IDs are right and the tools still fail.** Go straight to the CLI below, which is fully working on the same account. Only `list_teams` is worth calling, and only to confirm the connector is alive.

So **skip all discovery calls** — `list_projects` / `list_organizations` / `list_teams` — you already have every ID.

## Vercel MCP absent? Use the CLI (verified 2026-07-14)

Some sessions have **no Vercel MCP tools at all** (ToolSearch finds none — only Supabase/Gmail/Drive are connected). Don't hunt; fall back to the Vercel CLI, which covers most of the same ground:

- `npx vercel whoami` — if not logged in, it starts a device-code flow (user visits vercel.com/oauth/device); account `melkorinos`. Credentials then persist on this machine.
- Always pass `--scope melkorinos-projects`.
- `npx vercel ls greek-bee [--prod]` — deployments list (works fine, unlike MCP `list_projects`).
- `npx vercel inspect <url-or-dpl_id>` — deployment metadata (accepts alias or id; gives `dpl_…`, created time, aliases).
- `npx vercel inspect <dpl_id> --logs` — full build logs incl. the Next.js route table. **Writes to stderr** — run via Bash with `2>&1` redirect into a file; PowerShell `2>$null` eats it (0 lines).
- **`npx vercel logs` QUERIES HISTORY — the old "live-stream from now, no lookback" note here was wrong (re-measured 2026-08-12, CLI 58.9.4).** Streaming is opt-in via `--follow`; without it the command runs a *historical* query and supports `--since` / `--until` (ISO or relative: `30m`, `24h`, `7d`), `--level error|warning|info|fatal`, `--status-code 500|4xx`, `--query "status:500 error"`, `--source`, `--environment production|preview`, `--branch`, `--limit` (default 100, 1000 accepted), `--json`, `--expand`. This is the **whole monitoring surface** now that MCP is 403 — see trap 4.
  - **Needs the repo linked**, or the flag forms have no project context. `.vercel/` is gitignored, so write it yourself, no prompt and no network: `{"projectId":"prj_HNH0oGZw3o7taDayCAtVe7BViOFl","orgId":"team_AUMxvbaDutPq8SMboMcf4sED"}` into `.vercel/project.json`.
  - **Retention reaches at least 7 days** — verified by walking `--since 7d --until 6d` back through real ISO timestamps to `2026-08-06`. `--until` genuinely filters; the human-readable output prints **time-of-day with no date**, so windows look identical and you will misread them. **Use `--json` and parse `timestampInMs` whenever the date matters.**
  - **`--limit` truncates newest-first, silently.** `--since 7d --limit 1000` on this project returned 1000 rows *all from today* — it is a cap, not a window. Slice with `--since`/`--until` per day rather than trusting one wide call.
  - **"No logs found" is ambiguous** — it means "none matched", which reads identically to "the query is broken". Always re-run unfiltered over the same window before reporting an absence of errors.
  - JSON rows carry `timestampInMs`, `level`, `requestPath`, `responseStatusCode`, `source`, `message`, `requestId`.
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
- `ADMIN_SECRET` gates every admin review route — since ADR 0016 the secret always travels as an `X-Admin-Secret` header and a bad one is always **401** (the old nominations body-`adminSecret`/403 shape is gone; `requireAdmin` in `src/lib/apiRoute.ts` is the one gate, and it denies everyone when `ADMIN_SECRET` is unset). The `?godmode=zzkdgr3` URL param is a **client-only Leksokipos cheat** (hardcoded in `GameBoard.tsx`, never server-validated); the Leksikastirio page also accepts `?godmode=` as an alias for `?admin=`, and shows approve/reject buttons for ANY non-empty value — the API still 401s unless the value matches `ADMIN_SECRET`.

## Verified project facts (so you don't re-derive)

- **14 tables, all RLS-enabled** (`public.` schema): `game_scores` (~220), `game_state` (~90), `nominations`, `nomination_votes`, `player_profiles`, `player_achievements`, `player_pangrams` (migration `20260706120000`), `player_words` (newest, migration `20260718120000` — words-by-length lane, dark behind `FEATURE_FLAGS.achievements`; + invoker-rights RPC `player_words_by_length`), `transfer_codes`, `identity_audit`, and 4 `community_*_puzzles`. (Re-verified live 2026-07-18.)
- **No Supabase Edge Functions** — server logic is Next.js API routes on Vercel. Don't hunt for edge functions.
- **Preview deployments are protected — an agent cannot reach one over HTTP** (measured 2026-08-12). `curl` to a `greek-<hash>-melkorinos-projects.vercel.app` preview returns **302** to Vercel SSO, while production `greek-bee.vercel.app` returns **200**. So anything that must be *exercised* on a preview needs the operator's logged-in browser, or a protection-bypass token — plan around it instead of discovering it mid-task.
- **Production runtime baseline (2026-08-12), for telling "quiet" from "broken":** ~1000+ log rows/day, dominated by `POST /api/game-state` and `POST /api/game-scores` (~450 each) plus `GET /` — the continuous score-post lane, not an anomaly. Status mix is `200`/`304` only; **zero `error`-level lines and zero 5xx across the full 7-day window.** A day with 5xx or any `level:error` row is therefore a real signal here, not noise.
- **Keys:** legacy anon JWT + publishable `sb_publishable_DzrXPPJlqRlQshOccwnlBg_n3IFkEy8` (both enabled).
- **Advisor baseline is noisy but expected** — `get_advisors security` returns **18 lints, all BY DESIGN** (re-verified 2026-07-16 after the hardening batch): 2 INFO `rls_enabled_no_policy` on the server-only tables (`identity_audit`, `transfer_codes`); 15 WARN `rls_policy_always_true`, every one a deliberate permissive **per-command** policy (open INSERT on `game_scores`/`game_state`/`nominations`/`nomination_votes`/`player_achievements`/`player_pangrams`/`player_profiles`/4 community tables, plus UPDATE on `game_scores` + `game_state` (upserts) and UPDATE+DELETE on `nomination_votes` (the vote toggle)); 1 WARN auth leaked-password-protection off. **No ALL-command grant remains anywhere** (migrations `20260716120000`/`120100`). Counting quirk: narrowing `game_state` ALL→per-command *raised* its WARN count from 1 to 2 — lint count is not a security score; compare against this list, not the number. **Don't treat these as regressions.** `get_advisors performance` is clean.

## Happy-path recipes

**"Is prod healthy?"** → `get_project { projectId: "greek-bee", teamId }` → check `latestDeployment.readyState == "READY"`. Then `get_runtime_errors` (pre-aggregated, fast) → `get_runtime_logs { group_by: "statusCode" }`.

**"Why did the build fail?"** → `list_deployments` → grab the failing `dpl_…` → `get_deployment_build_logs { idOrUrl: "<dpl_…>", errorsOnly: true }`.

**Supabase inspect/debug (read-only, allowlisted):** `list_tables`, `list_migrations`, `execute_sql` (SELECT), `get_advisors { type }`, `get_logs { service }` — services: `api | postgres | auth | storage | realtime | edge-function | branch-action`. All with `project_id`.

## Applying migrations via MCP — the two gotchas (verified 2026-07-15)

The sanctioned path stays `npx supabase db push` (keeps migration-history in sync). But when you *do* apply via MCP (user-authorised), two things bit and will bite again:

1. **`apply_migration` can 502 while `execute_sql` works.** On 2026-07-15 `apply_migration` returned Cloudflare `502 origin_bad_gateway` (retryable) on every attempt, yet read-only *and* write `execute_sql` calls to the same project succeeded seconds apart — the mutating-migration origin path was specifically unhealthy, not the whole server. (Transient: on 2026-07-16 `apply_migration` worked first try, four times.) **Fallback:** run the DDL through `execute_sql` with `CREATE INDEX IF NOT EXISTS` / idempotent guards. Same DB state; no bogus migration-history row (see #2). On any 502, **first re-run a read-only check** (`SELECT … FROM pg_indexes …`) to see whether the failed write actually landed before retrying — a blind retry of bare `CREATE INDEX` errors "already exists".
2. **MCP-applied DDL never records the file's version in migration history.** Neither `apply_migration` (invents its own version) nor `execute_sql` (records nothing) writes the `20260715120000`-style version your committed `supabase/migrations/*.sql` file carries. So a later `npx supabase db push` sees that file as un-applied and re-runs it → `index already exists`. One-time fix when you next push: `supabase migration repair --status applied <version>`. The *schema itself* is correct — only the CLI bookkeeping drifts. Always keep the committed `.sql` file as the authoritative record regardless. **Confirmed live 2026-07-16:** the four hardening migrations (`202607161200xx` files) were recorded as `20260716175545`/`180413`/`181113`/`204554` — the invented rows are harmless. **RESOLVED 2026-07-18 — history is clean; a plain `db push` is safe again.** All seven owed file versions were repaired `--status applied`, the five *invented* MCP rows (`20260716175545`/`180413`/`181113`/`204554`/`20260717114857`) repaired `--status reverted` (push refuses to run while remote holds versions unknown locally — the `applied` repair alone is not enough), and `20260718120000_add_player_words` was pushed. `SUPABASE_DB_URL` now lives in `.env.local` (session-pooler URI — the direct-connection string is IPv6-only and fails from home networks). **Two traps hit during the fix:** a dashboard DB-password reset takes ~60 s to propagate to the pooler (auth fails until then — retry before assuming the password is wrong), and the Docker warning `db push` prints at the end is harmless catalog-caching noise. Any future MCP `apply_migration` re-creates the invented-version debt — prefer `db push` now that the URL exists.
3. **The auto-mode permission classifier can block `execute_sql` writes that look destructive** (e.g. a table-wide `UPDATE` used as a constraint probe, or any statement containing an obviously-junk value) even when the intent is a harmless should-fail test. On 2026-07-17 it blocked both `execute_sql` AND `apply_migration` for a legitimate, operator-authorised data migration (the vrestifrasi flip) — the block fires *before* the user sees a prompt, so retrying tools is pointless. **A bare `REVOKE` trips it too** (the stavrolekso `edit_pin` grant fix, same day) — "destructive-looking" includes privilege removal, even when the migration is a security *fix*. **2026-07-18: it also pre-blocked CLI `supabase migration repair --status reverted` AND `supabase db push` run via the agent's shell** — when that happens, hand the exact command to the operator's own terminal (that's how the player_words push landed). There, the operator switching permission mode was what unblocked it, and the retried `apply_migration` then succeeded first try: worth offering as an option rather than defaulting straight to the dashboard. Don't fight it: for reads, prove the fact read-only (`pg_enum`/`pg_constraint`/`pg_policies`); for authorised writes, hand the SQL to the operator for the dashboard SQL editor, or have them switch the permission mode so prompts reach them.

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

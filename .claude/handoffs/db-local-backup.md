# Handoff — Supabase local DB backup (NOT yet done)

**Status:** Procedure only. No backup has been taken; no tooling exists in the repo
(`grep` confirms: no `db-backups/`, no scripts, no `.gitignore` entry). This doc is
so a future session can execute it cleanly.

## Goal

Take a **local, gitignored** snapshot of the production Supabase Postgres database
(roles + schema + data) before/around significant releases. The DB is otherwise
untouched by the app's normal deploys (no migrations run from CI).

## Why it's optional (read before doing it)

The app makes **no schema migrations** from deploys; releases change static JSON data
and frontend only. So a backup is **insurance**, not a rollback requirement for a
typical deploy. Worth doing before any future *schema* change, or just periodically.

## Prerequisites

- Node + `npx` (the Supabase CLI runs via `npx supabase` — **no install needed**).
- The **Session-pooler** connection string from the Supabase Dashboard:
  **Settings → Database → Connection string → _Session pooler_** (URI form).
  - It is **IPv4-friendly, port `5432`**.
  - **NOT** the "Direct connection" host (IPv6-only, fails on many networks).
  - **NOT** the Transaction pooler (port `6543`) — `pg_dump` needs a session.
  - ⚠️ This string embeds the DB password — **do not commit it or paste it into
    chat/logs.** Provide it only at the moment of running, e.g. via an env var.

## Steps

```bash
# 0. Make the target dir gitignored (one-time)
echo "db-backups/" >> .gitignore

# 1. Hold the connection string in a shell var (not in history/files)
#    (paste when prompted; or: read -s CONN)
export CONN="postgresql://postgres.<...>:<REDACTED>@<host>:5432/postgres"

# 2. Dump into a timestamped folder
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "db-backups/$TS"
npx supabase db dump --db-url "$CONN" -f "db-backups/$TS/roles.sql"  --role-only
npx supabase db dump --db-url "$CONN" -f "db-backups/$TS/schema.sql"
npx supabase db dump --db-url "$CONN" -f "db-backups/$TS/data.sql"   --data-only

# 3. Sanity check the files are non-empty, then clear the var
ls -la "db-backups/$TS"
unset CONN
```

## Restore (reference only — destructive)

Into a fresh/empty Postgres (e.g. a local Supabase or a staging DB), in order:
`roles.sql` → `schema.sql` → `data.sql` via `psql "$TARGET" -f <file>`. Never restore
straight onto production without a maintenance window.

## Related cleanup task (separate, also pending)

**Rotate the `sb_secret_` service key.** It may have been exposed in chat during
earlier work. Rotate in Supabase Dashboard → Project Settings → API, then update the
deployment env var (Vercel). Low risk for a personal project, but do it. (No key value
is recorded here — by design.)

## References (do not duplicate here)

- DB tables (10) + their purpose: see `CONTEXT.md` → "Database tables".
- Supabase client singleton + device identity: `src/lib/supabase.ts`, ADR 0007.

## Suggested skills for the executing session

- **`/run`** is not relevant. This is a terminal/CLI task — run the commands directly.
- If wiring this into a repeatable npm script later, consider **`/tdd`** for the script
  and **`/to-issues`** to track "automate DB backup" as tech debt.
- Use **`/diagnose`** only if a dump fails (e.g. wrong pooler/port, IPv6 host).

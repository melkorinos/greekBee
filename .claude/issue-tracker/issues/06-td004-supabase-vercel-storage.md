# TD-004 — Supabase not managed via Vercel Storage

Status: ready-for-human

The Supabase database was provisioned directly on supabase.com. Migrating to Vercel Storage → Supabase integration would auto-inject all environment variables and consolidate management to one dashboard.

## Why this matters

- Currently requires manual env var management (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.) in Vercel project settings.
- Vercel Storage integration auto-injects these, reducing risk of misconfiguration on redeploy.

## Migration steps (zero code changes needed)

1. Create a new Supabase project via Vercel Storage dashboard.
2. Re-run the SQL schema from `.agents/aiHelper/log.md` (scores + wordle_scores tables).
3. Backfill any historical data if needed.
4. Remove manually-set env vars from Vercel project settings.
5. Verify leaderboard queries work on the new connection.

## Risk

Data migration — existing leaderboard scores must be exported and re-imported. Low technical risk, but requires a maintenance window.

## Comments

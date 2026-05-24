# TD-004 — Supabase not managed via Vercel Storage integration

Status: ready-for-human

The Supabase project was provisioned directly on supabase.com. Migrating to the Vercel Storage → Supabase integration would auto-inject all environment variables and consolidate management to a single dashboard.

## Why this matters

- Currently requires manual env var management in Vercel project settings (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the service-role key used by the suggestion review script).
- Vercel Storage integration auto-injects these on every deployment, reducing risk of misconfiguration.

## Current schema (5 tables — must be recreated on the new project)

| Table | Used by | Notes |
|-------|---------|-------|
| `word_suggestions` | `POST /api/suggest-word` | Open anon INSERT |
| `game_scores` | `POST/GET /api/game-scores` | Leksokipos + Leksindeseis leaderboard |
| `leksiarxeio_scores` | `POST/GET /api/leksiarxeio-scores` | Per-length attempt tracking |
| `player_profiles` | `POST/GET /api/profile` | Cross-device sync profiles |
| `game_state` | `POST/GET /api/game-state` | Cross-device state blobs |

SQL for `player_profiles` and `game_state` is in `.claude/aiHelper/handoff-phase4.md`.
SQL for `game_scores` and `leksiarxeio_scores` is in the comment blocks at the top of their respective route files (`src/app/api/game-scores/route.ts`, `src/app/api/leksiarxeio-scores/route.ts`).
`word_suggestions` schema is in `src/lib/supabase.ts`.

## Migration steps (no code changes needed)

1. Create a new Supabase project via Vercel Storage dashboard.
2. Re-run all five `CREATE TABLE` + RLS SQL blocks on the new project.
3. Export existing data from the old project (Supabase dashboard → Table editor → Export CSV) and import into the new tables.
4. Vercel Storage injects the new `POSTGRES_URL`-style env vars — verify `src/lib/supabase.ts` reads `NEXT_PUBLIC_SUPABASE_URL` (update if the injected var name differs).
5. Remove the manually-set env vars from Vercel project settings.
6. Deploy and verify all five API routes function correctly against the new DB.

## Risk

Data migration — existing leaderboard scores and player profiles must be exported and re-imported. Low technical risk but requires a short maintenance window. The `game_state` and `player_profiles` tables are new (Phase 4) so data loss there is minimal if skipped.

## Comments

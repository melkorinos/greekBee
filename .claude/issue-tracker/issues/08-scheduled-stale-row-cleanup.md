# Scheduled stale-row cleanup for player_profiles and word_suggestions

Status: ready-for-agent

## What to build

Add a Vercel cron job that runs daily and deletes rows that have no active cleanup today:

- `player_profiles` where `last_active` is older than 90 days
- `word_suggestions` where `created_at` is older than 30 days

The job lives at `POST /api/cron/cleanup`, protected by the `CRON_SECRET` environment variable that Vercel injects. The `upsertAndClean` utility already handles 7-day rolling cleanup for `game_scores`, `leksiarxeio_scores`, and `game_state` on-demand — this cron covers the two tables that have no cleanup path at all.

Register the job in `vercel.json` with a `"crons"` entry (`0 3 * * *` — 03:00 UTC daily).

## Acceptance criteria

- [ ] `POST /api/cron/cleanup` returns 401 if `Authorization: Bearer <token>` does not match `CRON_SECRET`
- [ ] On success, deletes `player_profiles` rows where `last_active < now() - interval '90 days'`
- [ ] On success, deletes `word_suggestions` rows where `created_at < now() - interval '30 days'`
- [ ] `vercel.json` registers the cron at `0 3 * * *` pointing at `/api/cron/cleanup`
- [ ] Route uses Edge runtime (no Fluid CPU cost)
- [ ] Unit tests cover the 401 guard and each DELETE branch (mock Supabase)
- [ ] `CRON_SECRET` documented in README under environment variables

## Blocked by

None — can start immediately.

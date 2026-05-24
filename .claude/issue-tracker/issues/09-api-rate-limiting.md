# API rate limiting per device to prevent DB flooding

Status: ready-for-human

## What to build

The RLS policies on all five tables (`game_scores`, `leksiarxeio_scores`, `player_profiles`, `game_state`, `word_suggestions`) are wide-open (`anon INSERT` unrestricted). A single device can insert unlimited rows. Decide on and implement a rate-limiting strategy before player count grows.

Three candidate approaches — the human must pick one before an agent can implement:

**A. Supabase RLS count-check (no new dependency)**
Add a `WITH CHECK` expression on each INSERT policy that counts existing rows for the `device_id`/`device_uuid` within the relevant time window and rejects if over a threshold. Pure SQL, zero infra cost. Downside: a count query on every INSERT; may not hold under coordinated abuse.

**B. Next.js middleware + Upstash Redis (new dependency)**
A middleware layer (or per-route check) uses a Redis sliding-window counter keyed by device_id. Cheap per-request, robust against bursts. Requires adding `@upstash/ratelimit` + `@upstash/redis` and a Redis instance. Requires explicit approval before installing new dependencies (project rule).

**C. Document and accept risk at current scale**
Record the surface, set a Supabase row-count alert, and revisit when daily active users exceed a threshold. Zero implementation cost now.

## Acceptance criteria

- [ ] Approach chosen and documented in `CONTEXT.md` under persistence decisions
- [ ] If A or B: each INSERT-capable route returns 429 when the per-device limit is exceeded
- [ ] If A or B: unit tests cover the rate-limit rejection path
- [ ] If C: Supabase row-count alert configured and threshold documented in `reflections.md`

## Blocked by

None — can start immediately (decision step is human, implementation follows).

# Record the error-monitoring decision — it is already made

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Error monitoring"
**Decided:** 2026-08-12, in the TICKET-07 grill. This is now a write-up, not a comparison.

## Why

Nothing in this Platform tells anyone when it breaks. Production dependencies are exactly four —
`next`, `react`, `react-dom`, `@supabase/supabase-js`. No Sentry, no analytics, no Speed Insights.
The only ways a failure surfaces today are a player mentioning it, or the operator opening the
Vercel dashboard and looking.

That was survivable at roughly eight players a day, all of them known personally. After a soft
launch the feedback loop breaks: a stranger who hits a 500 on `/api/scores` leaves and never says
anything. The failure mode this guards against is not a dramatic outage — it is a route quietly
throwing for a week while the dashboard sits unopened.

**Why the platforms alone do not close this.** Vercel and Supabase both hold the evidence, but neither
pushes it. Vercel's runtime errors and logs are pull-only — they surface a failure to whoever opens
the dashboard, which is precisely the habit that cannot be relied on, and their retention window is
short enough that a quiet week-long fault can age out before anyone looks. Supabase sees the database
and PostgREST, not the app: a broken render, a bad route, or a client-side throw never reaches it at
all. So "we already have Vercel and Supabase" is the *source* of the data, not the monitoring. This
ticket exists to turn that raw data into a named, scheduled check with a proven signal path.

The repo has a standing lesson that applies directly: **green gates say nothing about production.**
`reflections.md` records the `player_milestones` deploy window, where five live-DB tests went green
the moment a migration landed and were structurally blind to whether the accompanying deploy had
happened at all. Monitoring is the instrument that would have answered that.

## The decision

**No third-party error SDK. Vercel's built-in observability only.** Taken by the operator on
2026-08-12 so that TICKET-07's privacy page could state "no third-party tracking" and have it stay
true. The reasoning, which the ADR must record:

- Vercel Pro is already paid for. `get_runtime_errors` and `get_runtime_logs` are reachable from an
  agent session via MCP, and `npx vercel logs` from a terminal. "Already there" beats "one more
  dependency".
- A client-side error SDK is JavaScript on every page load, and `soul.md` names Fluid Active CPU as
  the primary cost constraint.
- A third-party error monitor is a third-party processor. Installing one would have forced a privacy
  page rewrite and a consent question the Platform currently does not have to answer at all.

**Consequence for TICKET-07: the dependency is dissolved, not merely sequenced.** The two tickets can
now close in either order. If this decision is ever reversed, TICKET-07's page must be revised in the
same branch — that coupling survives even though the sequencing problem does not.

## Scope

- [ ] Write the ADR. Record the decision above, **and why Sentry and outright refusal were not
      chosen** — a decision with no record is one a future session re-litigates. Note explicitly
      that the privacy page depends on it.
- [ ] Define the manual check that replaces an alerting tool, concretely enough that the operator
      can actually do it: which Vercel view, what to look for, how often. A vague "check the
      dashboard sometimes" is what the Platform already has and is not a close.
- [ ] Prove the chosen path actually surfaces a real failure. Cause an error in a deployed preview
      and confirm it appears in Vercel's runtime errors. The standing rule in this repo is measure
      the artifact, not the response — it has been re-learned four times (`reflections.md`,
      s130 / s132 / s139 / s146). Do not close this on having written the ADR.
- [ ] `npm install` is **not** part of this ticket. If a future session concludes otherwise, it stops
      and asks — `CLAUDE.md` forbids new dependencies without explicit approval.

## Done when

- [ ] The ADR exists, records the decision and the rejected alternatives, and names the TICKET-07
      coupling.
- [ ] The manual check is written down and has been walked through once.
- [ ] A deliberately-thrown error in a deployed preview was observed arriving in Vercel's runtime
      errors.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` clean.

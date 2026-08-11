# Decide and install error monitoring — or decline it in writing

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Error monitoring"

## Why

Nothing in this Platform tells anyone when it breaks. Production dependencies are exactly four —
`next`, `react`, `react-dom`, `@supabase/supabase-js`. No Sentry, no analytics, no Speed Insights.
The only ways a failure surfaces today are a player mentioning it, or the operator opening the
Vercel dashboard and looking.

That was survivable at roughly eight players a day, all of them known personally. After a soft
launch the feedback loop breaks: a stranger who hits a 500 on `/api/scores` leaves and never says
anything. The failure mode this guards against is not a dramatic outage — it is a route quietly
throwing for a week while the dashboard sits unopened.

The repo has a standing lesson that applies directly: **green gates say nothing about production.**
`reflections.md` records the `player_milestones` deploy window, where five live-DB tests went green
the moment a migration landed and were structurally blind to whether the accompanying deploy had
happened at all. Monitoring is the instrument that would have answered that.

## Scope

This is a **decision ticket**, not an install order. The work is to compare, choose, and either
install or record a refusal — all three are valid closes.

- [ ] Compare the realistic options against this project's constraints. At minimum:
  - **Sentry free tier** — client + server, ~1 dependency and a config file. The default assumption.
  - **Vercel's own observability** — already paid for on Pro; `get_runtime_errors` and
    `get_runtime_logs` exist and are reachable from an agent session via MCP. Costs nothing new.
    Ask honestly whether it is sufficient, since "already there" beats "one more dependency".
  - **Declining outright**, with a documented manual check instead.
- [ ] Weigh against the project's actual constraints, not generic best practice:
  - **Bundle size and Fluid Active CPU.** `soul.md` names Fluid CPU as the primary cost constraint.
    A client-side error SDK is JavaScript on every page load. Measure it; do not assume it is free.
  - **`CLAUDE.md` forbids installing dependencies without explicit approval.** If the answer is
    Sentry, the ticket pauses and asks before `npm install`.
  - **Privacy.** A third-party error monitor receives request data and is a third-party processor.
    TICKET-07's privacy page carries a "no third-party tracking" line — if this ticket installs
    something, that line must change, and the two tickets must not be closed independently.
- [ ] Whatever is chosen, prove it works by **causing a real error in a deployed preview** and
      confirming it arrives. Do not close this on a successful `npm install`. The standing rule in
      this repo is measure the artifact, not the response — it has been re-learned four times
      (`reflections.md`, s130 / s132 / s139 / s146).

## Done when

- [ ] The options above are compared in writing, in an ADR — including the one that was chosen and
      why the others were not. A decision with no record is one a future session re-litigates.
- [ ] Either the chosen tool is installed and **verified against a real thrown error in a deployed
      preview**, or the refusal is recorded in the same ADR with the manual check that replaces it.
- [ ] If anything third-party was installed, TICKET-07's privacy page is updated in the same branch.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` clean.

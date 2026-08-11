# Operational headroom — set the alerts that were decided but never configured

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Operational readiness"

## Why

An accepted risk is only accepted if the thing that made it acceptable actually exists.

`reflections.md` records the API rate-limiting decision: every INSERT-capable route writes to
Supabase with no per-device throttle, RLS permits unlimited anonymous inserts, and the call was
**accept and monitor** — explicitly conditioned on two Supabase row-count alerts (`game_scores` at
50 000 rows, `nominations` at 5 000) that the operator would configure in the dashboard. There is
no evidence they were ever set. If they were not, the mitigation half of that decision never
happened and the risk is simply unmitigated.

The second half is capacity. Vercel is **Pro**; Supabase is **Free**. The Free plan's ceilings —
database size, monthly active users, egress, connections — have never been read against a
realistic traffic estimate, because until now the estimate was "three friends". A soft launch
changes the number without changing the plan.

This is deliberately scoped small. It is dashboard work and one reading exercise, not engineering.

## Scope

- [ ] **Set the two row-count alerts** in the Supabase dashboard: `game_scores` at 50 000 rows,
      `nominations` at 5 000. If Supabase's Free plan cannot express a row-count alert, say so and
      substitute the nearest thing it does offer (database-size alert), recording the substitution.
- [ ] **Read the Supabase Free-plan limits** and write the current numbers down against them —
      database size, monthly active users, egress, connection limits. `list_tables` via MCP gives
      live row counts; `/project-mcp` has the identifiers, load it first.
- [ ] **State a soft-launch traffic estimate and check it against those limits.** A guess is fine;
      an unstated guess is not. The output is a sentence of the form "at N players a day we are at
      X% of the binding limit, which is Y".
- [ ] **Name the binding constraint.** One of the Free-plan limits will bite first. Say which, and
      what the trigger is for moving to Pro.
- [ ] Check Vercel's Fluid Active CPU headroom on Pro against the same estimate. `soul.md` names
      Fluid CPU as the primary cost constraint and `reflections.md` records it at 21m 7s over five
      active days at beta traffic. **Per-function CPU and the Fluid gauge are dashboard-only** — not
      reachable via MCP or the CLI (see `/project-mcp`), so this needs the operator to look.

## Explicitly not in scope

Load testing, cost modelling, a CDN or caching review, moving to Supabase Pro, and building any
rate limiting. Redis sliding-window rate limiting has its own trigger already recorded in
`reflections.md` — revisit when DAU exceeds ~500. This ticket only closes the gap between a
decision that was made and the configuration it assumed.

## Done when

- [ ] Both alerts exist in the Supabase dashboard, or a recorded substitution does.
- [ ] The Free-plan limits, the current numbers, the traffic estimate and the binding constraint are
      written down — in `reflections.md` under the existing rate-limiting entry, which is where the
      original decision lives and therefore where a future session will look.
- [ ] The Fluid CPU headroom figure is recorded alongside them.

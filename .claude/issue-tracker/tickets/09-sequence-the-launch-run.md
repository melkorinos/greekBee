# Sequence the launch run — commit to an order

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:grilling`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_
**Blocked by:** [Launch checklist](01-launch-checklist-what-does-launch-actually-require.md),
[UI scope](02-ui-redesign-scope-tweaks-or-epic.md)

## Question

Given the resolved checklist and the resolved UI verdict, what is the committed order of work
from here to the go/no-go — and what is the honest calendar estimate?

The operator asked for this explicitly on 2026-07-31: *"set an order for tasks, create tickets
ready for agent pickup."* This is the ticket that produces that order, and it is deliberately
**late** on the map rather than first — sequencing before the checklist and the UI verdict
exist would be sequencing against guesses, and the UI answer in particular can swing the
timeline by weeks.

**This ticket is the last decision on the map.** When it closes, the destination is reached:
the remaining work is execution against a known list, and the go/no-go is the operator's
scheduling call.

### Inputs

- The blocking/accepted split from [Launch checklist](01-launch-checklist-what-does-launch-actually-require.md)
- The tweaks-or-epic verdict from [UI scope](02-ui-redesign-scope-tweaks-or-epic.md)
- Whatever the other tickets resolved to by then — some may have been ruled out of scope, and
  that is a valid input, not a gap

### Output

1. **An ordered list** of the remaining build work, each item pointing at the decision that
   authorised it
2. **Vertical-slice tickets** for each, via `/to-tickets` — filed as issues in
   `.claude/issue-tracker/issues/`, not as tickets here. Wayfinder tickets hold decisions;
   build slices are ordinary issues, labelled `ready-for-agent` so an agent can pick one up
   cold
3. **The `dev → main` merge** placed explicitly in the order, with its manual browser
   play-through (`goals.md` item 1: Leksodromia + Leksoplegma, plus the deliberate visual
   shifts from sessions 102–104 — leksindeseis/stavrolekso page rhythm, stavrolekso maker CTAs,
   NominationModal banner hues)
4. **What is consciously *not* being done before launch**, written down, so it does not
   silently resurface as a blocker later

### Then

Update `goals.md` — the North Star gets a launch phase, and "Current Focus" stops saying
*"no single active epic"*. Delete the handoff docs whose threads are now fully resolved or
ruled out of scope. **`logopaignio-content-pool.md` and `engagementEpic.md` stay** — they are
deferred and out of scope, not done.

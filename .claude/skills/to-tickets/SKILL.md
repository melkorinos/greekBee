---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker — edges as text in one file per ticket locally, or native blocking links on a real tracker.
disable-model-invocation: true
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets** — tracer-bullet vertical slices, each declaring the tickets that **block** it.

Tickets go in `.claude/tracker/tickets/`. Read `.claude/tracker/README.md` for the conventions before publishing — this repo has no triage labels and its own file template.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference (a spec path, an issue number or URL) as an argument, fetch it and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges** — the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch. When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket — green is promised only there.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **What it delivers**: the end-to-end behaviour this ticket makes work

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct — does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?

Iterate until the user approves the breakdown.

### 5. Publish the tickets

Write one file per ticket into `.claude/tracker/tickets/`, in dependency order (blockers first), named `TICKET-NN-<slug>.md` — continuing the folder's **existing** number sequence, never restarting at `01`. Check what is already there first. One ticket per file, never a single combined file.

**A file that is missing any of the four required parts is not a ticket.** Why, an explicit scope checklist, a spec link, and a done-when — all four, or it belongs in `.claude/tracker/issues/` (a problem deferred) or back in `/grill-with-docs` (a question unanswered). Do not publish a half-specified slice and let the label carry it.

There are no triage labels in this repo. `Status:` is `ready` or `in-progress`, nothing else.

<ticket-template>

# <One-line statement of the work>

**Status:** ready
**Blocked by:** TICKET-NN  <!-- omit this line entirely when nothing blocks it -->
**Spec:** <path to the handoff, ADR, or document that authorises this>

## Why

One paragraph: the reason this work exists.

## Scope

- [ ] The end-to-end behaviour this ticket makes work, from the user's perspective
- [ ] ...

## Done when

The condition that closes the ticket — for this repo that normally includes `npm run test -- --run`, `npx eslint .` and `npm run build` passing, plus `npm run test:e2e` when a page, route or shared chrome component is touched.

</ticket-template>

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain that means top to bottom.

Do NOT close or modify the source document the tickets came from.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

Work the frontier one ticket at a time with `/tdd`, clearing context between tickets.

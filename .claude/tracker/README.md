# Tracker

Two folders, two different things. Nothing else lives here.

| Folder     | Holds                                                    | Naming                |
| ---------- | -------------------------------------------------------- | --------------------- |
| `issues/`  | Known defects and risks whose fix is **deferred**         | `ISSUE-NN-<slug>.md`  |
| `tickets/` | Work that is **ready for an agent to pick up and execute** | `TICKET-NN-<slug>.md` |

Each folder has its own number sequence, starting at `01`. Numbers are never reused.
`ISSUE-01` and `TICKET-01` are unrelated files — always say which one you mean.

There are no triage labels and no `closed/` archive. **When something is done, delete the
file.** Git history is the archive.

## `issues/` — problems we have decided not to fix yet

An issue is a defect or a risk that is real, understood, and consciously deferred. It exists so
the problem stays visible instead of living in someone's head.

An issue is **not** an idea, a feature request, or a nice-to-have. Those go in
`.claude/aiHelper/goals.md` or a handoff document. Keeping them out is what stops this folder
silting up.

```markdown
# <One-line statement of the problem>

**Deferred:** YYYY-MM-DD
**Revisit when:** <the concrete trigger that makes this worth fixing>

## Problem

What is wrong, what it costs, and how it was verified.

## Why deferred

Why it is not being fixed now, and what has to change for that to flip.
```

An agent that finds a real problem it is not fixing **writes the issue itself** — no need to
ask first. It must then **announce the new issue in its reply**, in one line, so the operator
can review it. Silent filing is how the folder fills with things nobody cares about.

## `tickets/` — work an agent can pick up cold

A ticket is executable. Someone with no memory of the conversation that produced it should be
able to open the file and start working.

**Nothing enters `tickets/` without all four of these.** If any is missing, it is not a ticket
— it is an issue, or a question for `/grill-with-docs`.

1. **Why** — one paragraph, the reason this work exists
2. **Scope** — an explicit checklist of what changes
3. **Spec** — a link to the handoff, ADR, or document that authorises it
4. **Done when** — the condition that closes the ticket

```markdown
# <One-line statement of the work>

**Status:** ready | in-progress
**Blocked by:** TICKET-NN  <!-- omit the line entirely when nothing blocks it -->
**Spec:** <path or link>

## Why

## Scope

- [ ] ...

## Done when
```

`Status:` exists so a concurrent session can see what is already claimed — set it to
`in-progress` before starting work. `Blocked by:` names what must resolve first — usually another
ticket, but it may also be a **named operator decision or piece of operator work**, which is the
commonest real blocker here (a sound file to record, a card to pick). Leave the line out when
nothing blocks it. A ticket blocked on a person should say exactly what the person has to hand back.

`/to-tickets` is the sanctioned way to turn a resolved decision into tickets. It writes here.

## Lifecycle

A deferred problem that becomes worth doing is **promoted**: move the file into `tickets/`,
rename it to the next `TICKET-NN`, and rewrite the header to the ticket template. One file
moves — never copy it, or the two drift.

Open questions are neither issues nor tickets. They belong in `.claude/handoffs/`. Resolving
one produces a decision (an ADR or a `CONTEXT.md` entry) and, usually, a set of tickets.

## Domain docs

See [domain.md](domain.md) for how skills should consume `CONTEXT.md` and `docs/adr/`.

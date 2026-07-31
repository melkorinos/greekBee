# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.claude/issue-tracker/issues/`.

## Conventions

- All issues are flat files under `.claude/issue-tracker/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file at `.claude/issue-tracker/issues/<NN>-<slug>.md` (next available number).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Wayfinding operations

Wayfinder maps and their decision tickets live in a **separate directory**,
`.claude/issue-tracker/tickets/`, so they never mix with the bug/task issues above.

- **The map** is `00-MAP-<slug>.md`, carrying `**Label:** wayfinder:map`.
- **Tickets** are `<NN>-<slug>.md` in the same directory, each with a
  `**Parent:**` link back to the map and a `wayfinder:<type>` label
  (`research` / `prototype` / `grilling` / `task`).
- **Blocking** is a `**Blocked by:**` line naming the blocking tickets as markdown links.
  A ticket is unblocked when every ticket it names has been closed.
- **Claiming** is the `**Assignee:**` line — set it before doing any work, so concurrent
  sessions skip the ticket. `_(unclaimed)_` means free.
- **The frontier** is every ticket that is open, unclaimed, and has no unclosed blocker.
- **Closing** a ticket: append a `## Resolution` section to its body, set `**Status:** closed`,
  move the file to `tickets/closed/`, and add its one-line gist to the map's
  "Decisions so far".
- **Build slices** produced by a resolved decision are filed as ordinary issues in
  `issues/`, not here. Tickets hold decisions; issues hold work.

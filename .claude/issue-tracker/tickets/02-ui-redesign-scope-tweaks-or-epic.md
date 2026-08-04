# UI: tweaks or full redesign?

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:prototype`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_

## Question

Is the launch UI a handful of tweaks, or the full redesign epic queued in `goals.md`?

The operator's read on 2026-07-31: *"I've heard the UI is not that bad, so maybe it's a few
tweaks instead of a full redesign."* That is the whole uncertainty. This ticket exists to
convert a vibe into a scoped decision, because the answer swings the size of this map more
than anything else on it.

`goals.md` item 2 already names the redesign surface — `globals.css`, `recipes.ts`,
`Modal.tsx`, `GamePageShell`/`GameHeader`, `GameLeaderboardModal` — and three decisions that
were deliberately deferred *into* the redesign:

1. Full-bleed vs padded game headers (Leksokipos keeps a bespoke full-bleed wrapper until this
   is settled)
2. Real accent colours for stavrolekso and leksikastirio (the current sky/indigo rows are
   placeholders)
3. Whether to tokenise `FeedbackBanner` and drop its `theme` prop (a visible change to
   Leksiarxeio's banner — see the ADR 0008 exceptions list)

Those three are real regardless of scope; a "tweaks" verdict does not make them disappear, it
just means they are the whole job rather than the opening move.

**Approach:** this is a `prototype` ticket on purpose. Judging "is the UI good enough for
strangers" from a description is guesswork — use `/prototype` to put concrete alternatives
side by side on one or two representative pages, and let the operator react. Do not start
from a blank redesign; start from the current UI and show what a tweak-tier pass buys.

**Resolution shape:** a verdict — *tweaks* (with the list) or *epic* (with a phase plan) —
plus a decision on each of the three deferred items above. If the verdict is *epic*, this
ticket also decides whether launch waits for it or ships on the current UI, since the operator
put the redesign inside the map without fixing that ordering.

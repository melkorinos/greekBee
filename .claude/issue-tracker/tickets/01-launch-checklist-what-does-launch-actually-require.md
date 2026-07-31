# Launch checklist — what does "launch-ready" actually require?

**Parent:** [MAP — Public launch readiness](00-MAP-public-launch-readiness.md)
**Label:** `wayfinder:grilling`
**Status:** ready-for-agent
**Assignee:** _(unclaimed)_

## Question

What is the concrete, enumerable set of conditions that must hold before the operator can
make a go/no-go call on public release?

The destination is "nothing is blocking a launch decision" — but the list of what counts as
blocking does not exist yet. Every other ticket on this map is sized against that list, and
three patches of fog (legal posture, operational readiness, content supply) cannot be
ticketed until this resolves.

Grill it out. The output is a written checklist, each line either **blocking** or
**accepted-as-is**, covering at minimum:

- Legal/privacy surface — privacy page, terms, GDPR stance on the DeviceId-as-credential model
  (`CONTEXT.md` treats DeviceId as a secret credential; a public audience raises the stakes)
- Operational — error monitoring, Vercel cost headroom, Supabase limits, first-spike behaviour
- Content supply — the thin Leksindeseis fallback pool flagged in `reflections.md`
- Which games are visible, and what happens to `wip:true` Λογοπαίγνιο on the picker
- Test/E2E gate — is the current Playwright suite the bar, or does it need growing first
- The `dev → main` merge itself (`goals.md` item 1: Leksodromia + Leksoplegma await a manual
  browser play-through)

**This is the first ticket. Nothing else on the map should be worked before it** — it is what
tells the rest of the map how big it is.

Resolve with `/grill-with-docs` so `CONTEXT.md` and the ADRs are cross-checked and updated
inline as the checklist is pinned.

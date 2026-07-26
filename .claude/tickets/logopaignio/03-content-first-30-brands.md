# 03 — Content: first 30 brands

**Source spec:** `.claude/handoffs/logopaignio.md` (seed list + content pipeline)

**What to build:** 30 real puzzles so the wip build is genuinely playable with recognizable Greek brands — each a name-stripped **mark** with a curated accept-list. This is the developer's grind: an agent can't reliably fetch/crop real brand assets or judge recognizability.

**Blocked by:** 01 — Foundation (the puzzle JSON shape must be locked first).

**Status:** ready-for-human

- [ ] 30 brands that pass the **icon-only filter** — pure wordmarks (logo is just the name) are skipped — spread across sectors from the seed list.
- [ ] Each brand has: a **mark-only asset with the wordmark stripped** (sourced icon / favicon / brand-kit "symbol", or cropped as fallback); its sector; an **accept-list** (Greek form + Latin form + common variants); and a **credit/source recorded** for takedown readiness.
- [ ] Rules honored: **current logo only**, **master/parent brand only**, foreign-owned allowed **if still perceived as Greek**, defunct brands allowed.
- [ ] Assets sized/optimized so the blur reveal reads well; each puzzle row validates against the shape from ticket 01.
- [ ] Build green with the 30 puzzles in daily rotation.

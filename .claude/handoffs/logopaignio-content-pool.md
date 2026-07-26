# Handoff: Λογοπαίγνιο — grow the puzzle pool to 150–200

**Date:** 2026-07-26
**Status:** Backlog — blocked until the game is live (tickets 01–04 in `.claude/tickets/logopaignio/`).
**Goal:** Ongoing content curation beyond the first 30 brands (ticket 03) up to **150–200** puzzles, so the daily rotation doesn't repeat for months.
**Owner:** Human-led. An agent can scaffold the JSON shape and draft accept-lists from names, but it cannot reliably fetch/crop real brand assets or judge recognizability.

**Parent spec:** `.claude/handoffs/logopaignio.md` (concept, locked decisions, seed sector list, content pipeline).

---

## The task

Repeat the per-brand recipe from ticket 03, at scale, until the pool reaches launch depth:

1. Pick a brand that passes the **icon-only filter** (pure wordmarks skipped — if the logo *is* the name, drop it).
2. Source its **mark-only asset** (app icon / favicon / brand-kit symbol) and strip the wordmark; crop as fallback.
3. Write the **accept-list** (Greek form + Latin form + common variants).
4. Record **sector** and **credit/source** (takedown readiness).

## Rules (same as the spec)

- **Current logo only** — no old/rebrand versions.
- **Master/parent brand only** — no product-line sub-brands.
- **Foreign-owned allowed if still perceived as Greek** (Goody's, Chipita-era brands, etc.).
- **Defunct brands allowed** — nostalgia marks (Olympic Airways, retired ΟΤΕ/WIND marks) are a feature and help reach depth.

## If the pool stalls before 150

Relax **"recognizable"** before you relax **"icon-only"**. Dropping the icon-only filter breaks the game (you'd be back to unguessable stripped wordmarks); dropping "must be a household name" just makes some days harder, which is acceptable once the core pool is solid. Defunct/nostalgia marks are the other lever to reach depth.

## Seed sectors

See the sector-organized candidate list in the parent spec (`.claude/handoffs/logopaignio.md` → "Seed candidate list"). Realistic yield after the icon-only filter is ~80–130 from the seed; the remainder to 150–200 comes from the long tail + defunct marks.

## Progress

- [ ] 30 (wip build — ticket 03)
- [ ] 60
- [ ] 100
- [ ] 150 (launch floor)
- [ ] 200 (comfortable)

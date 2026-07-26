# 04 — Legal note + live flip

**Source spec:** `.claude/handoffs/logopaignio.md`

**What to build:** The game is documented as a conscious IP risk and turned live for players.

**Blocked by:** 02 — Playable UI slice; 03 — Content: first 30 brands.

**Status:** ready-for-human

- [ ] Risk/attribution note + a fast **takedown path** recorded (a `CONTEXT.md` row or a new ADR) — the ship-anyway logo-IP decision is captured so a future session knows it was deliberate, not an oversight.
- [ ] Operator play-through of several real puzzles: matching feels fair (accept-lists forgiving enough) and blur difficulty is tuned via the config knob.
- [ ] `wip:false`; game live in the picker/sidebar.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` all green.

# Hide the three unlaunched Games from every player-facing surface

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the launch checklist, line "Which Games are visible"

## Why

Eleven Games are registered and three carry `wip: true` — Leksindeseis (finished, community-backed,
never flipped), Πόσο κάνει; and Λογοπαίγνιο (both one placeholder puzzle). Today all three render on
the picker and in the drawer under a «🚧 Υπό κατασκευή» section.

That section was honest signage for an audience of three friends. For strangers arriving from an
announcement it reads as abandonment: three of eleven cards say the site is unfinished. Operator's
call on 2026-08-11 — **all three are out of scope for launch and are hidden from view**, not
promoted and not finished.

The distinction being introduced matters and is the reason this is not a one-line edit. `wip` means
*unfinished*. Leksindeseis is finished; it is simply not launching. Overloading `wip` for both would
lose that, and the registry header (`src/config/games.ts`) documents its states deliberately —
PRESENTATION derives, BEHAVIOUR enrols. A third state keeps the fact in the config instead of in a
comment that rots.

## Scope

- [ ] Add a third registry state to `GameRegistryRow` — `hidden: boolean` alongside `wip`, or a
      single `visibility` field if that reads better on inspection. Whichever shape is chosen, the
      **semantic split must survive**: `wip` = unfinished, `hidden` = finished-or-not, deliberately
      not shown. Document both in the file's header block.
- [ ] Mark all three rows hidden. Leksindeseis keeps `wip: true` **and** its `capabilities` — the
      2026-08-06 comment on that row explaining the flag is still accurate and should be extended,
      not replaced.
- [ ] **Picker** ([`src/app/page.tsx`](../../../src/app/page.tsx)) — `gameList` / `wipList` at lines
      161–162. A hidden Game appears in neither. Delete the «Υπό κατασκευή» section and its divider
      once `wipList` can only ever be empty; leaving dead markup invites a future session to
      resurrect it.
- [ ] **Drawer** ([`src/components/shared/Shell.tsx`](../../../src/components/shared/Shell.tsx)) —
      `MAIN_GAME_IDS` / `WIP_GAME_IDS` at lines 63–64. Same treatment.
- [ ] **Offline Mode** ([`src/hooks/useOfflineMode.tsx`](../../../src/hooks/useOfflineMode.tsx))
      line 38 filters on `!wip` alone, so a hidden Game that is not `wip` would silently join
      `OFFLINE_GAME_IDS`. The feature is parked and unreachable, so nothing breaks today — fix it
      anyway, because the parked code is exactly what a future revival trusts.
- [ ] **Verify, do not assume, that nothing else enumerates Games.** `registryCoverage.test.tsx`
      pins the drawer derivation; grep for `GAME_REGISTRY` and `gameIdsWith` and walk every hit.
      Known-safe on inspection: `HomeTrophyButton` and `SubmitPuzzleButton` render *inside* the
      picker card ([`page.tsx:187`](../../../src/app/page.tsx#L187)), so hiding a card takes its
      leaderboard and community-submit entry points with it — confirm this rather than trusting it.
- [ ] Routes stay live and reachable by direct URL. Do **not** add a redirect or a 404 — the three
      Games keep working for anyone holding a link, which is how the operator plays them.
- [ ] Update `e2e/games.spec.ts` for the eight-Game picker.
- [ ] Update the Current State table in `.claude/aiHelper/memory.md` and the game list in
      `README.md` / `CONTEXT.md` — `wip` is no longer the whole story of what a player sees.

## Decide during the work

The registry header states a deliberate design: presentation derives from the rows, behaviour
enrols via `capabilities`. A third presentation state is a real addition to that design, not a
config tweak. **Write an ADR** recording why `hidden` is separate from `wip` and why it is
presentation rather than a capability — a code comment is not enough for a decision that a future
session will otherwise "simplify" back into one flag.

## Done when

- [ ] The picker and the drawer show eight Games and no «Υπό κατασκευή» section.
- [ ] `/leksindeseis`, `/posokanei` and `/logopaignio` still load and play when typed directly.
- [ ] `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` all clean.
      This ticket touches the picker, the Shell and a route list, so the e2e run is **mandatory**
      before calling the branch ready — see the standing rule in `CLAUDE.md`.
- [ ] An ADR records the `wip` vs `hidden` split.

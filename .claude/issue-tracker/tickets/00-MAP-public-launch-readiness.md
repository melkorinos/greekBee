# MAP — Public launch readiness

**Label:** `wayfinder:map`
**Status:** ready-for-agent
**Created:** 2026-07-31
**Driver:** Dimitrios

## Destination

**Nothing is blocking a launch decision.** Every known blocker across the handoffs folder is
either resolved or consciously accepted, so the go/no-go on releasing the Greek Word Games
platform to the general public is a scheduling call, not an engineering one. The date stays
the operator's.

Reaching the destination does **not** require the launch to have happened — it requires that
no open question stands between here and pressing the button.

## Notes

- **Domain:** Greek word/geography games platform. Read `CLAUDE.md`, then
  `.claude/aiHelper/soul.md`, `memory.md`, `goals.md`, `reflections.md`, `log.md` before working
  any ticket.
- **Skills every session should consult:** `/grill-with-docs` for anything under-specified
  (most tickets here are), `/to-tickets` to break a resolved decision into build slices,
  `/tdd` for the builds themselves, `/project-mcp` before any Supabase/Vercel MCP call.
- **This map plans; it mostly does not build.** Tickets resolve decisions. Where a ticket is a
  `task` type it does real work, but only to unblock a decision. Actual feature builds are
  handed off to `/to-tickets` + `/tdd` afterwards — **with one deliberate exception**: where a
  decision's entire consequence is under ~30 lines (the monetization crawl), the ticket may
  carry the build, because splitting it costs more than doing it.
- **Never `git push`.** Standing rule. Sessions stop after committing.
- **Source handoffs** live in `.claude/handoffs/`. A ticket that resolves a handoff thread
  should say so, and the handoff doc gets deleted once all its threads are resolved or ruled
  out of scope.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- **2026-08-03 — Offline Lock: GO, rescoped to platform-wide Offline Mode, and it does NOT ship
  before launch.** Ticket 07 resolved and deleted. Both of its open questions are answered: lock
  state lives in a **React context at Shell level** (the localStorage+`storage` option is rejected —
  `storage` does not fire in the originating tab, and it would add a second localStorage writer
  beside `useGameStore`), and the toggle sits in the **Shell drawer**, not in game chrome. Scope
  widened from Leksokipos-only to **all 8 `wip:false` games**, warm start only — cold start
  re-examined against the operator's "on the plane" framing and **rejected a second time** (every
  game page is `force-dynamic`, so cold start needs a service worker *plus* a rendering
  rearchitecture). Score queueing stays **Leksokipos-only** in the first pass; the rest is deferred
  to [issue 15](../issues/15-offline-cross-game-score-queueing.md). Brief:
  ADR 0010 amended. *(Handoff deleted on completion; the surviving detail lives in ADR 0010 and
  issue 15.)*
  **BUILT 2026-08-03 (s132), then SCOPE-REDUCED the same day.** Cross-game offline play — the
  feature's headline promise — **does not work**: `force-dynamic` payloads are not cached, so
  prefetching cannot make another game load offline (proven in `e2e/offlineMode.spec.ts`). What
  ships is **single-page round protection**, which does work. Multi-game offline needs a service
  worker and reopens ADR 0010. Still **not on the launch path**, so this changes nothing about the
  sequencing above.

> **Process note.** Ticket 07 was worked *before* [Launch checklist](01-launch-checklist-what-does-launch-actually-require.md),
> which this map declares should come first. That was an operator call on 2026-08-03 and the
> sequencing rule otherwise stands — nothing else should jump the checklist. It did not cost
> anything here: the outcome was to take Offline Mode **off** the launch path, so the checklist's
> verdict on it can only confirm, not contradict. Ticket 07's `Blocked by` on the checklist is
> therefore discharged rather than ignored.

## Not yet specified

- **What "launch" exposes legally.** The site is already publicly deployed, so this is about
  posture rather than a new surface: privacy/terms text, GDPR stance on the DeviceId, and
  whether the Λογοπαίγνιο trademark question (deferred, but the *game code* ships `wip:true`)
  needs a visible answer. Can't be ticketed until [Launch checklist](01-launch-checklist-what-does-launch-actually-require.md)
  says whether legal pages are in the definition.
- **Operational readiness under stranger traffic.** Error monitoring, Vercel cost headroom
  when traffic is no longer three friends, Supabase connection limits, and what happens on the
  first real spike. Sharpens once the launch checklist fixes the definition — the crawl
  monetization link exists precisely because traffic costs money.
- **Content supply after launch.** `reflections.md` flags the thin Leksindeseis static-fallback
  pool and there is no reminder system. A public audience burns puzzle pools faster than a
  private one. Not yet sharp: unclear whether this is a launch blocker or a week-two problem.
- **Which games launch.** All 8+ are live on the picker, but Λογοπαίγνιο is `wip:true` and
  deferred. Whether it stays visible-but-wip, hidden, or gated is a decision that hangs on the
  launch checklist.
- **E2E coverage depth.** `goals.md` wants happy-path coverage per game. Whether the current
  Playwright suite is sufficient for a launch gate is unclear until the checklist exists.

## Out of scope

- **Λογοπαίγνιο content pool** — deferred by the operator on 2026-07-31. ~161 assets need
  manual per-image human isolation; the cost is too high to sit on the launch path. The game
  stays `wip:true` and the handoff
  (`.claude/handoffs/logopaignio-content-pool.md`) stays intact and untouched for a later
  effort. **Do not delete that handoff.** Note the map still carries one in-scope question
  *about* it — whether a wip game is visible at launch — which is a launch decision, not
  content work.
- **The engagement epic** (`.claude/handoffs/engagementEpic.md`) — explicitly excluded by the
  operator when this map was charted. Retention/engagement work is a post-launch effort.
- **Monetization "walk" and "run" levers** — the transparency page, sponsor slot, ethical ads,
  memberships. The handoff itself sequences these after the crawl; none is a launch blocker,
  and the ads path additionally depends on an unverified eligibility question.

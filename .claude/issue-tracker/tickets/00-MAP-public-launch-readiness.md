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
- **This map plans; it does not build.** Tickets resolve decisions. Where a ticket is a `task`
  type it does real work, but only to unblock a decision. Actual feature builds are handed off
  to `/to-tickets` + `/tdd` afterwards. *(There used to be one exception — a ticket could carry
  its own build when the whole consequence was under ~30 lines. Its only claimant, the
  monetization crawl, is off the map, so no ticket carries a build now.)*
- **Never `git push`.** Standing rule. Sessions stop after committing.
- **Source handoffs** live in `.claude/handoffs/`. A ticket that resolves a handoff thread
  should say so, and the handoff doc gets deleted once all its threads are resolved or ruled
  out of scope.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- **2026-08-06 — Five islands added, Δήλος dropped, Topothesies is at 109 answers and the
  handoff is retired.** Ticket 05 resolved and deleted; `.claude/handoffs/topothesies-unpeelable-and-review.md`
  deleted with it — its last live thread. The ticket's own framing was wrong: neither a
  `place=island` override nor connected-component splitting was needed, because a δήμος spanning
  several islands already arrives as **one polygon per island** — the islands only had to be
  *selected*, never split. Κουφονήσια (drawing both Άνω and Κάτω, the Παξοί precedent), Σχοινούσα,
  Ηρακλειά, Δονούσα and Κάλαμος are live. Their outlines were **measured before the decision**, not
  assumed: 106–243 points after the pipeline's own simplification, inside the band of shapes that
  already ship (Καστελλόριζο 136, Αγαθονήσι 253, Λειψοί 333, Πόρος 362). **Δήλος is a permanent
  drop** — uninhabited, no capital, and the capital stage is required of every answer. **Καστός is
  a deliberate omission**, recorded so it does not read as an oversight. `PROXIMITY_MAX_KM` stays
  938 and no existing shape or centroid moved — verified by diffing all 104 against HEAD. Everything
  durable from the handoff is now in **ADR 0018's Amendments** (the OSM/QID join, the gitignored
  re-fetch procedure, the `fetchWikidata` QID-field failure mode, the capital-not-area landmass
  rule, and the Πόρος / Θεσσαλονίκη / Τροιζηνία-Μέθανα verdicts) plus two CONTEXT glossary terms.

- **2026-08-06 — Πόρος graduated; the bug was ours, not OSM's, and the fix unblocks ticket 05.**
  Ticket 04 resolved and deleted. The `place=island` coastline override the ticket proposed was
  **not built and is not needed**: Δήμος Πόρου's dump already contains the correct island, but
  the δήμος also owns a strip of Argolid coast fractionally *larger* than the island, so the
  pipeline's "draw the largest polygon" rule drew the mainland. `project.polygonsBestFirst` now
  picks the polygon holding the answer's capital — a no-op for all 69 other islands, verified by
  diffing every emitted shape. 104 answers, `DEFERRED_ANSWER_IDS` empty, `PROXIMITY_MAX_KM`
  still 938. **Knock-on:** the same point-in-polygon selection answers what
  ticket 05 was blocked on — five of its six islands were already separate polygons and needed
  only a real capital coordinate, not the connected-component splitting feature everyone assumed.
  Both were resolved the same day; see the entry above.

- **2026-08-06 — Χαλκιδική un-merged and Θεσσαλονίκη dropped from Topothesies entirely.**
  Ticket 03 resolved and deleted. All three candidates were rendered from OSM and judged by eye:
  the merge was burying
  Χαλκιδική's three-finger peninsula, and Θεσσαλονίκη alone is a shapeless blob — so it does
  **not** return as its own answer. Still 103 answers, `PROXIMITY_MAX_KM` unchanged at 938,
  `gameRules.ts` untouched. Detail in the handoff's Thread 2. **Found and fixed a latent
  pipeline bug on the way:** `fetchWikidata.ts` had stopped emitting the QID the δήμος join
  keys on, so any regeneration from a fresh clone would silently have degraded to
  spatial-nearest guessing for all 452 municipalities.

- **2026-08-06 — Monetization is off the launch path. Ticket 06 deleted, nothing built.**
  Operator call: the crawl step (Ko-fi account, `SUPPORT_URL` in `platform.ts`, «Στήριξε το
  παιχνίδι» drawer link) was blocked on human work — creating the account and an accountant's
  read — and none of it gates a go/no-go. No code ever existed, so there is nothing to revert.
  Everything the ticket held is folded back into `.claude/handoffs/HANDOFF-monetization.md`:
  the locked decision table, the operator's human half, the tax flag now spelling out that it
  gates *receiving* money rather than shipping the link, the Κοινότητα-section placement, the
  `npm run test:e2e` requirement (the drawer is shared chrome), and the traffic-costs-money
  rationale. Resumable as written whenever the operator wants it.

- **2026-08-03 — Offline Lock: GO, rescoped to platform-wide Offline Mode, and it does NOT ship
  before launch.** Ticket 07 resolved and deleted. Both of its open questions are answered: lock
  state lives in a **React context at Shell level** (the localStorage+`storage` option is rejected —
  `storage` does not fire in the originating tab, and it would add a second localStorage writer
  beside `useGameStore`), and the toggle sits in the **Shell drawer**, not in game chrome. Scope
  widened from Leksokipos-only to **all 8 `wip:false` games**, warm start only — cold start
  re-examined against the operator's "on the plane" framing and **rejected a second time** (every
  game page is `force-dynamic`, so cold start needs a service worker *plus* a rendering
  rearchitecture). Score queueing stays **Leksokipos-only** in the first pass; the rest is deferred
  to [the parked handoff](../../aiHelper/offlineFeature-handoff.md). Brief:
  ADR 0010 amended. *(The surviving detail lives in ADR 0010 and the handoff.)*
  **BUILT 2026-08-03 (s132), then SCOPE-REDUCED the same day.** Cross-game offline play — the
  feature's headline promise — **does not work**: `force-dynamic` payloads are not cached, so
  prefetching cannot make another game load offline (proven in `e2e/offlineMode.spec.ts`). What
  ships is **single-page round protection**, which does work. Multi-game offline needs a service
  worker and reopens ADR 0010. **PARKED 2026-08-04 (s133)** — the drawer toggle is removed so the
  feature is unreachable and production can ship without it; the code stays dormant. Still **not on
  the launch path**, so this changes nothing about the sequencing above.

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
  first real spike. Sharpens once the launch checklist fixes the definition. Note the cost side
  now has no funding counterpart on the map — monetization is off it entirely.
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
- **Monetization, entirely** — the crawl (Ko-fi link) as well as the "walk" and "run" levers
  (transparency page, sponsor slot, ethical ads, memberships). Removed from the map on
  2026-08-06; see the Decisions entry below. `.claude/handoffs/HANDOFF-monetization.md` stays
  intact and holds every locked decision. **Do not delete that handoff.**

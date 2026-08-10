# Launch readiness — the open questions between here and a go/no-go

**Created:** 2026-07-31 as a wayfinder map · **Converted to a handoff:** 2026-08-06
**Driver:** Dimitrios

Wayfinder is retired in this repo. This document replaces the map at
`.claude/issue-tracker/tickets/00-MAP-public-launch-readiness.md` and its three unresolved
decision tickets. It holds **open questions**, not work. When a question resolves, the answer
goes to an ADR or `CONTEXT.md`, its build slices are filed as tickets in
`.claude/tracker/tickets/`, and the question is struck from this file. When every question is
struck, delete this handoff.

## Destination

**Nothing is blocking a launch decision.** Every known blocker across the handoffs folder is
either resolved or consciously accepted, so the go/no-go on releasing the Greek Word Games
platform to the general public is a scheduling call, not an engineering one. The date stays
the operator's.

Reaching the destination does **not** require the launch to have happened — it requires that
no open question stands between here and pressing the button.

## How to work this document

- Read `CLAUDE.md`, then `.claude/aiHelper/soul.md`, `memory.md`, `goals.md`, `reflections.md`,
  `log.md` before starting.
- `/grill-with-docs` resolves anything under-specified — which is most of what is left here.
  `/to-tickets` turns a resolved question into build slices. `/tdd` builds them.
  `/project-mcp` before any Supabase or Vercel MCP call.
- **This document plans; it does not build.** Resolving a question produces a decision and a
  set of tickets, not a commit against the feature.
- **Never `git push`.** Standing rule. Sessions stop after committing.
- Other handoffs in this folder are source material. A resolved question should say which
  handoff thread it closes, and a handoff gets deleted once all its threads are resolved or
  ruled out of scope.

## Open question 1 — What does "launch-ready" actually require?

**Work this first. Nothing else here should be worked before it** — it is what tells the rest
of this document how big it is.

What is the concrete, enumerable set of conditions that must hold before the operator can make
a go/no-go call on public release? The destination is "nothing is blocking a launch decision",
but the list of what counts as blocking does not exist yet. Everything else is sized against
that list, and the three patches of fog below cannot be ticketed until this resolves.

The output is a written checklist, each line either **blocking** or **accepted-as-is**,
covering at minimum:

- Legal and privacy surface — privacy page, terms, GDPR stance on the DeviceId-as-credential
  model (`CONTEXT.md` treats DeviceId as a secret credential; a public audience raises the
  stakes)
- Operational — error monitoring, Vercel cost headroom, Supabase limits, first-spike behaviour
- Content supply — the thin Leksindeseis fallback pool flagged in `reflections.md`
- Which games are visible, and what happens to `wip:true` Λογοπαίγνιο on the picker
- Test and E2E gate — is the current Playwright suite the bar, or does it need growing first
- The `dev → main` merge itself (`goals.md` item 1: Leksodromia and Leksoplegma await a manual
  browser play-through)
- **Run `supabase/scripts/launch-reset.sql` on release day — BLOCKING, and it belongs on the
  checklist however question 1 resolves.** The rebuilt badge catalog retires
  `leksokipos-first-daily` and `leksokipos-theristis` and revives `leksokipos-tzimani`; those
  frozen-id exceptions are licensed by this wipe and by nothing else (ADR 0013 §4, ADR 0012's
  reset amendment). Until it runs, live rows hold ids the catalog no longer names. It is run by
  hand in the dashboard, never by `db push`, and only AFTER both tickets are deployed —
  running it against the old catalog would wipe progress and immediately re-earn the retired
  ids. Take a backup first (`npm run db:backup`); one Supabase project backs dev and prod, so
  there is no rehearsal and no undo.

Resolve with `/grill-with-docs` so `CONTEXT.md` and the ADRs are cross-checked and updated
inline as the checklist is pinned.

## Open question 2 — UI: tweaks or full redesign?

Is the launch UI a handful of tweaks, or the full redesign epic queued in `goals.md`? The
operator's read on 2026-07-31: *"I've heard the UI is not that bad, so maybe it's a few tweaks
instead of a full redesign."* That is the whole uncertainty. The answer swings the size of the
remaining work more than anything else here.

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

**Approach:** use `/prototype`. Judging "is the UI good enough for strangers" from a
description is guesswork — put concrete alternatives side by side on one or two representative
pages and let the operator react. Do not start from a blank redesign; start from the current
UI and show what a tweak-tier pass buys.

**Resolution shape:** a verdict — *tweaks* (with the list) or *epic* (with a phase plan) —
plus a decision on each of the three deferred items above. If the verdict is *epic*, this also
decides whether launch waits for it or ships on the current UI, since the operator put the
redesign in scope without fixing that ordering.

## Open question 3 — Sequence the launch run

**Blocked by questions 1 and 2.** This is deliberately last — sequencing before the checklist
and the UI verdict exist would be sequencing against guesses, and the UI answer in particular
can swing the timeline by weeks.

Given the resolved checklist and the resolved UI verdict, what is the committed order of work
from here to the go/no-go, and what is the honest calendar estimate? The operator asked for
this explicitly on 2026-07-31: *"set an order for tasks, create tickets ready for agent
pickup."*

**When this closes, the destination is reached:** the remaining work is execution against a
known list, and the go/no-go is the operator's scheduling call.

### Inputs

- The blocking/accepted split from question 1
- The tweaks-or-epic verdict from question 2
- Whatever else resolved by then — some questions may have been ruled out of scope, and that
  is a valid input, not a gap

### Output

1. **An ordered list** of the remaining build work, each item pointing at the decision that
   authorised it
2. **Vertical-slice tickets** for each, via `/to-tickets`, filed in `.claude/tracker/tickets/`
   so an agent can pick one up cold
3. **The `dev → main` merge** placed explicitly in the order, with its manual browser
   play-through (`goals.md` item 1: Leksodromia and Leksoplegma, plus the deliberate visual
   shifts from sessions 102–104 — leksindeseis/stavrolekso page rhythm, stavrolekso maker CTAs,
   NominationModal banner hues)
4. **What is consciously *not* being done before launch**, written down, so it does not
   silently resurface as a blocker later

### Then

Update `goals.md` — the North Star gets a launch phase, and "Current Focus" stops saying *"no
single active epic"*. Delete the handoff docs whose threads are now fully resolved or ruled out
of scope. **`logopaignio-content-pool.md` and `engagementEpic.md` stay** — they are deferred and
out of scope, not done.

## Not yet sharp enough to be a question

- **What "launch" exposes legally.** The site is already publicly deployed, so this is about
  posture rather than a new surface: privacy/terms text, GDPR stance on the DeviceId, and
  whether the Λογοπαίγνιο trademark question (deferred, but the *game code* ships `wip:true`)
  needs a visible answer. Cannot be ticketed until question 1 says whether legal pages are in
  the definition.
- **Operational readiness under stranger traffic.** Error monitoring, Vercel cost headroom when
  traffic is no longer three friends, Supabase connection limits, and what happens on the first
  real spike. Sharpens once question 1 fixes the definition. The cost side has no funding
  counterpart — monetization is out of scope.
- **Content supply after launch.** `reflections.md` flags the thin Leksindeseis static-fallback
  pool and there is no reminder system. A public audience burns puzzle pools faster than a
  private one. Unclear whether this is a launch blocker or a week-two problem.
- **Which games launch.** Eleven games are registered; **three are `wip: true`** and render
  under «Υπό κατασκευή» — Λογοπαίγνιο and Πόσο κάνει; (both awaiting real content) and
  **Leksindeseis**, which is fully built and whose flag was simply never flipped (confirmed
  deliberate by the operator on 2026-08-06). Whether each stays visible-but-wip, hidden, gated,
  or is promoted hangs on question 1.
- **E2E coverage depth.** `goals.md` wants happy-path coverage per game. Whether the current
  Playwright suite is sufficient for a launch gate is unclear until the checklist exists.

## Out of scope

- **Λογοπαίγνιο content pool** — deferred by the operator on 2026-07-31. Around 161 assets need
  manual per-image human isolation; the cost is too high to sit on the launch path. The game
  stays `wip:true` and `.claude/handoffs/logopaignio-content-pool.md` stays intact and
  untouched for a later effort. **Do not delete that handoff.** One in-scope question remains
  *about* it — whether a wip game is visible at launch — which is a launch decision, not
  content work.
- **The engagement epic** (`.claude/handoffs/engagementEpic.md`) — explicitly excluded by the
  operator. Retention and engagement work is a post-launch effort.
- **Monetization, entirely** — the crawl (Ko-fi link) as well as the "walk" and "run" levers
  (transparency page, sponsor slot, ethical ads, memberships). Removed on 2026-08-06.
  `.claude/handoffs/HANDOFF-monetization.md` stays intact and holds every locked decision.
  **Do not delete that handoff.**

## Decisions already made

Carried over from the retired map. One line per resolved question.

- **2026-08-06 — Podium badges rejected; the achievement catalog was rebuilt instead.** The
  question asked which podium tiers and thresholds to build; the answer is **none**. **Podium
  slots are fixed at three while the audience grows**, so any "finished top-N" badge gets
  strictly harder over time — a metric problem no threshold fixes. Measured before deciding: 44
  days, 365 scores, 8.3 players/day, top device 16 firsts in 28 days played. A percentile metric
  is audience-proof but backfires at this scale (10% of 8 players is one player, harsher than
  first place). **The whole podium lane is deleted with the badge** — including the cross-device
  query in `/api/profile/stats` that fetches every device's Leksokipos rows, retiring a known
  scaling risk rather than leaving a paid query feeding a deleted cell. The follow-on catalog
  review settled much more: **`player_milestones`** absorbs `player_pangrams` + `player_words`
  and carries the two new counters; **Στην Κορυφή** and **Θεριστής→Τζιμάνι** become tiered;
  **Πρώτα Βήματα is removed** and **`leksokipos-tzimani` revived** (frozen-id exceptions two and
  three, licensed only by the pre-launch wipe); **one displayed badge, permanently**; **emoji
  glyphs retired** for drawn SVG marks. All of it in **ADR 0013's 2026-08-06 amendment**.
  **Built 2026-08-07** across TICKET-01 and TICKET-02 — five tiered badges, the unified
  `player_milestones` table, and `supabase/scripts/launch-reset.sql`; ADR 0013's 2026-08-07
  amendment records where it superseded the 2026-08-06 one (pangram thresholds 25/60/150, the
  ratio at 0.7, and `leksokipos-theristis` retired outright). `badgeIdeas.md` is discharged. Two
  things remain and both are operator actions, not build work: **the after-hours deploy window**,
  and **running the reset on release day** (see the checklist bullet in question 1). Badge art
  **shipped 2026-08-10** (TICKET-03, ticket deleted): every emoji glyph is now a drawn SVG mark in a
  tier-coloured frame, recorded in ADR 0013 §7. It was decoupled from everything above and landed
  independently, exactly as planned. Still owed on it: an operator eye-check in both themes.
- **2026-08-06 — Five islands added, Δήλος dropped, Topothesies is at 109 answers.** Neither a
  `place=island` override nor connected-component splitting was needed: a δήμος spanning several
  islands already arrives as **one polygon per island** — the islands only had to be *selected*,
  never split. Κουφονήσια (drawing both Άνω and Κάτω, the Παξοί precedent), Σχοινούσα, Ηρακλειά,
  Δονούσα and Κάλαμος are live, outlines **measured before the decision** at 106–243 points,
  inside the band of shapes that already ship. **Δήλος is a permanent drop** — uninhabited, no
  capital, and the capital stage is required of every answer. **Καστός is a deliberate
  omission.** `PROXIMITY_MAX_KM` stays 938 and no existing shape or centroid moved. Durable
  detail in **ADR 0018's Amendments** plus two CONTEXT glossary terms.
- **2026-08-06 — Πόρος graduated; the bug was ours, not OSM's.** The `place=island` coastline
  override was **not built and is not needed**: Δήμος Πόρου's dump already contains the correct
  island, but the δήμος also owns a strip of Argolid coast fractionally *larger* than the island,
  so the pipeline's "draw the largest polygon" rule drew the mainland.
  `project.polygonsBestFirst` now picks the polygon holding the answer's capital — a no-op for
  all 69 other islands, verified by diffing every emitted shape.
- **2026-08-06 — Χαλκιδική un-merged and Θεσσαλονίκη dropped from Topothesies entirely.** All
  three candidates were rendered from OSM and judged by eye: the merge was burying Χαλκιδική's
  three-finger peninsula, and Θεσσαλονίκη alone is a shapeless blob, so it does **not** return as
  its own answer. **Found and fixed a latent pipeline bug on the way:** `fetchWikidata.ts` had
  stopped emitting the QID the δήμος join keys on, so any regeneration from a fresh clone would
  silently have degraded to spatial-nearest guessing for all 452 municipalities.
- **2026-08-06 — Monetization is off the launch path, nothing built.** Operator call: the crawl
  step (Ko-fi account, `SUPPORT_URL` in `platform.ts`, «Στήριξε το παιχνίδι» drawer link) was
  blocked on human work — creating the account and an accountant's read — and none of it gates a
  go/no-go. No code ever existed. Everything is folded into
  `.claude/handoffs/HANDOFF-monetization.md`, resumable as written.
- **2026-08-03 — Offline Lock: GO, rescoped to platform-wide Offline Mode, and it does NOT ship
  before launch.** Lock state lives in a **React context at Shell level** (the
  localStorage+`storage` option is rejected — `storage` does not fire in the originating tab, and
  it would add a second localStorage writer beside `useGameStore`), and the toggle sits in the
  **Shell drawer**, not in game chrome. Scope widened to **all 8 `wip:false` games**, warm start
  only — cold start **rejected a second time** (every game page is `force-dynamic`, so cold start
  needs a service worker *plus* a rendering rearchitecture). ADR 0010 amended. **BUILT 2026-08-03
  (s132), then SCOPE-REDUCED the same day:** cross-game offline play **does not work** —
  `force-dynamic` payloads are not cached, proven in `e2e/offlineMode.spec.ts`. What ships is
  **single-page round protection**. **PARKED 2026-08-04 (s133)** — the drawer toggle is removed
  so the feature is unreachable and production can ship without it; the code stays dormant.

# Launch readiness — the open questions between here and a go/no-go

**Created:** 2026-07-31 as a wayfinder map · **Converted to a handoff:** 2026-08-06
**Question 1 resolved:** 2026-08-11 · **Driver:** Dimitrios

This document holds **open questions**, not work. When a question resolves, the answer goes to an
ADR or `CONTEXT.md`, its build slices are filed as tickets in `.claude/tracker/tickets/`, and the
question is struck. When every question is struck, delete this handoff.

## Destination

**Nothing is blocking a launch decision.** Reaching it does not require the launch to have
happened — it requires that no open question stands between here and pressing the button. The date
stays the operator's.

## How to work this document

- Read `CLAUDE.md`, then `soul.md`, `memory.md`, `goals.md`, `reflections.md`, `log.md`.
- **This document plans; it does not build.** `/to-tickets` turns a resolved question into build
  slices; `/tdd` builds them. `/project-mcp` before any Supabase or Vercel MCP call.
- **Never `git push`.** Standing rule. Sessions stop after committing.

---

## ✅ Question 1 — RESOLVED 2026-08-11: what "launch-ready" requires

Resolved by `/grill-with-docs`. **Launch is a soft launch** — telling a wider circle, no broadcast
— chosen so the checklist stays finite; a real announcement can follow once monitoring has seen
real traffic. The site is already publicly deployed, so launch is an act of promotion, not a change
in exposure.

### Blocking

| # | Item | Owner |
|---|---|---|
| `TICKET-06` | Hide the three unlaunched Games from picker, drawer and Offline Mode | agent |
| `TICKET-07` | Privacy page in Greek, linked from the Shell | agent |
| `TICKET-08` | Error monitoring — compare, choose, install **or** decline in writing | agent |
| `TICKET-09` | Operational headroom — the two Supabase alerts + Free-plan limits read | operator |
| `TICKET-10` | Share preview — Open Graph card and favicon | agent |
| `TICKET-05` | Three Sound Cue MP3s — **blocks any deploy**, the toggle ships playing silence | operator |
| — | Play-through of `dev` on preview before the `main` merge | operator |
| — | The release-day runbook below | operator |

### Accepted as-is

- **Terms of service** — not written. A free game with no payments, no lockable accounts and no
  user-to-user messaging does not need them; a copy-pasted document is worse than none. Revisit if
  money or public user-generated content ever enters.
- **E2E coverage** — the gate is `npm run test -- --run` and `npm run test:e2e` both green on the
  merge commit, not a bigger suite. Expansion is real and deferred: `ISSUE-03`.
- **Disaster-recovery backups** — `ISSUE-01` stays deferred. Automation and the dev/prod split are
  not launch work. Reduced to one runbook line: a manual `npm run db:backup` before the reset.
- **Content supply for the three hidden Games** — moot. Leksindeseis's static fallback is **one
  puzzle** (dated 2026-05-12, generic categories) rotating over a single-item array, and
  Πόσο κάνει; / Λογοπαίγνιο each hold one placeholder. All three are hidden, so none of it ships.
- **API rate limiting** — the accepted risk in `reflections.md` stands. `TICKET-09` only closes the
  gap between that decision and the alerts it assumed.
- **Λογοπαίγνιο's trademark question** — the game is hidden, so nothing visible needs an answer.
  The note owed at any future wip→live flip is unchanged.

### The release-day runbook — order is load-bearing

1. Merge `dev → main` and deploy.
2. **Verify production is serving the merge commit.** Not the migration, the deploy — `reflections.md`
   records that live-DB tests go green on a migration alone and are blind to whether the deploy
   happened.
3. `npm run db:backup`, dump moved **off the machine**.
4. `supabase/scripts/launch-reset.sql`, by hand in the dashboard.
5. Announce.

Steps 3 and 4 are why the order matters. The reset empties `game_scores`, `game_state`,
`player_achievements` and `player_milestones` on a **Free-plan project with no PITR** — that dump is
the only undo that will exist. And it must follow the deploy: run it while the old code is live and
badges re-earn against the retired emoji glyphs. `BadgeMark` (TICKET-03's art) is on `dev` only —
verified 2026-08-11, absent from `main`.

---

## Open question 2 — Sequence the launch run

Given the resolved checklist above, what is the committed order of work to the go/no-go, and the
honest calendar estimate? Asked explicitly by the operator on 2026-07-31: *"set an order for tasks,
create tickets ready for agent pickup."*

**When this closes, the destination is reached.**

### Inputs

- The blocking/accepted split above, and the five tickets it produced
- The UI verdict, which is being driven in separate operator sessions and is **not tracked here**
- `dev` is 7 commits ahead of both `origin/dev` and `main` (measured 2026-08-11)

### Output

1. **An ordered list**, each item pointing at the decision that authorised it. Two known
   constraints: `TICKET-08` should precede `TICKET-07`, or the privacy page's "no third-party
   tracking" line goes stale silently; and `TICKET-06` should precede the play-through, so the
   operator reviews the eight-Game picker strangers will see.
2. **The `dev → main` merge** placed explicitly, with its play-through — Leksodromia and Leksoplegma
   (`goals.md` item 1), the sessions 102–104 visual shifts, and the badge art eye-check in **both
   themes** still owed from TICKET-03. One session, on a preview of `dev`.
3. **What is consciously *not* being done**, written down, so it does not resurface as a blocker.

### Then

Update `goals.md` — the North Star gets a launch phase and "Current Focus" names it. Delete handoff
docs whose threads are fully resolved. **`logopaignio-content-pool.md`, `engagementEpic.md` and
`HANDOFF-monetization.md` stay** — deferred and out of scope, not done.

---

## Out of scope

- **The UI question** — tweaks vs redesign, and the three deferred UI decisions (full-bleed vs
  padded headers, real accents for stavrolekso/leksikastirio, tokenising `FeedbackBanner`). Removed
  2026-08-11: the operator drives them separately.
- **Λογοπαίγνιο content pool** — ~161 assets needing manual per-image isolation. Stays hidden;
  `.claude/handoffs/logopaignio-content-pool.md` is **do-not-delete**.
- **Πόσο κάνει; content** — photos and gov reference prices. Same treatment; the live summary is the
  «Πόσο κάνει;» section of `reflections.md`.
- **The engagement epic** (`engagementEpic.md`) and **monetization entirely**
  (`HANDOFF-monetization.md`). Both **do-not-delete**.

---

## Decisions already made

- **2026-08-11 — Question 1 resolved; see above.** Soft launch, five new tickets (`TICKET-06`–`10`),
  one new deferred issue (`ISSUE-03`), and a release-day runbook whose ordering is load-bearing.
  Two facts the grill measured rather than assumed: Leksindeseis's "thin" fallback pool is a
  **single** placeholder puzzle, and the Platform has **no legal surface and no monitoring of any
  kind** — production dependencies are exactly `next`, `react`, `react-dom`, `@supabase/supabase-js`.
- **2026-08-06 — Podium badges rejected; the achievement catalog was rebuilt instead.** Podium slots
  are fixed at three while the audience grows, so any "finished top-N" badge gets strictly harder
  over time. The whole podium lane was deleted with the badge, including the cross-device query in
  `/api/profile/stats`. The follow-on catalog review settled much more: `player_milestones` absorbs
  `player_pangrams` + `player_words`; five badges, every one tiered; Πρώτα Βήματα removed and
  `leksokipos-tzimani` revived; one displayed badge, permanently; emoji glyphs retired for drawn SVG
  marks. **ADR 0013** is the record. Built 2026-08-07 (TICKET-01/02); art shipped 2026-08-10
  (TICKET-03, §7). Still owed: the operator eye-check in both themes, folded into the play-through
  above.
- **2026-08-06 — Five islands added, Δήλος dropped, Topothesies is at 109 answers.** A δήμος
  spanning several islands already arrives as one polygon per island — the islands only had to be
  *selected*, never split. Δήλος is a permanent drop (uninhabited, no capital). Καστός is a
  deliberate omission. `PROXIMITY_MAX_KM` stays 938. **ADR 0018's Amendments.**
- **2026-08-06 — Πόρος graduated; the bug was ours, not OSM's.** Δήμος Πόρου's dump already contained
  the correct island, but the δήμος also owns a strip of Argolid coast fractionally *larger*, so
  "draw the largest polygon" drew the mainland. `project.polygonsBestFirst` now picks the polygon
  holding the answer's capital.
- **2026-08-06 — Χαλκιδική un-merged, Θεσσαλονίκη dropped from Topothesies entirely.** Judged by eye
  from real OSM renders. Found a latent pipeline bug on the way: `fetchWikidata.ts` had stopped
  emitting the QID the δήμος join keys on.
- **2026-08-06 — Monetization is off the launch path, nothing built.** The Ko-fi crawl step was
  blocked on human work and gates no go/no-go. No code ever existed.
- **2026-08-03 — Offline Lock: GO, rescoped to platform-wide Offline Mode, does NOT ship before
  launch.** Built 2026-08-03, scope-reduced the same day (cross-game offline play does not work —
  `force-dynamic` payloads are not cached, proven in `e2e/offlineMode.spec.ts`), then **PARKED
  2026-08-04**: the drawer toggle is removed so the feature is unreachable, code left dormant.
  **ADR 0010**, and `.claude/handoffs/offlineFeature-handoff.md`.

# Launch readiness — what is left between here and a go/no-go

**Created:** 2026-07-31 · **Question 1 resolved:** 2026-08-11 · **Last audit:** 2026-08-12
**Driver:** Dimitrios

One question is left. Everything else on this document has either shipped, been consciously
accepted, or moved somewhere with a better home. When question 2 closes, delete this handoff.

## Destination

**Nothing is blocking a launch decision.** Reaching it does not require the launch to have
happened — only that no open question stands between here and pressing the button. The date stays
the operator's.

## How to work this document

- Read `CLAUDE.md`, then `soul.md`, `memory.md`, `goals.md`, `reflections.md`, `log.md`.
- **This document plans; it does not build.** `/to-tickets` turns a resolved question into slices;
  `/tdd` builds them. `/project-mcp` before any Supabase or Vercel MCP call.
- **Never `git push`.** Standing rule — sessions stop after committing.

---

## Everything still pending, in one place

Audited against the filesystem and git on 2026-08-12. Nothing else is open.

### Open tickets — `.claude/tracker/tickets/`

| Ticket | What is left | Owner |
|---|---|---|
| `TICKET-05` | Three Sound Cue MP3s. **Blocks any deploy** — the 🔊 toggle is merged and plays silence today | operator |
| `TICKET-09` | `in-progress`. Agent half done. Owed: read **Egress** (Supabase → Organization → Usage), read **Fluid Active CPU** (Vercel → Observability → Functions), and **accept or reject the substitution** — Supabase has no row-count alert on any plan, so the control the accept-and-monitor decision assumed cannot be built | operator |
| `TICKET-10` | Open Graph card, `icon`, `apple-icon`, and deleting the stock `favicon.ico` that ships the **Next.js logo** in production today. Also fixes `PLATFORM_DESCRIPTION`, a fourth enumerating surface `TICKET-06` missed, which currently advertises all three hidden Games | agent |

### Owed, and not tickets

- **The play-through of `dev` on preview** — Leksodromia and Leksoplegma, the sessions 102–104
  visual shifts, and the badge art eye-check in **both themes** owed since `TICKET-03`. One session.
- **The release-day runbook** below.
- **`ISSUE-02` bookkeeping** — cited in `memory.md` and `goals.md`, **no file on disk**. Its
  `rlsInvariantsLiveDb` failures were reported gone in s144. Resolve or re-file; the number stays
  spent either way.

### Deferred, correctly, and not launch work

`ISSUE-01` (no disaster-recovery backups — reduced here to one runbook line), `ISSUE-03` (thin E2E
coverage), Offline Mode's manual device pass (`offlineFeature-handoff.md`), and the hidden Games'
content supply.

### Tracked elsewhere — do not re-file here

- **UI redesign** — operator-driven in separate sessions. Untracked by design.
- **Game icons** — `.claude/handoffs/game-icon-system.md` + `goals.md` item 5. Nothing designed;
  that handoff exists to make a grill productive and is expected to produce a ticket.
- **Platform logo** — the only genuinely untracked item. **`TICKET-10` depends on it**: the Open
  Graph card and the favicon both need a mark, so either the logo lands first or `TICKET-10` ships
  a deliberate placeholder and is revisited.

---

## The release-day runbook — order is load-bearing

1. Merge `dev → main` and deploy.
2. **Verify production is serving the merge commit.** Not the migration, the deploy —
   `reflections.md` records that live-DB tests go green on a migration alone and are blind to
   whether the deploy happened.
3. `npm run db:backup`, dump moved **off the machine**.
4. `supabase/scripts/launch-reset.sql`, by hand in the dashboard.
5. Announce.

Steps 3 and 4 are why the order matters. The reset empties `game_scores`, `game_state`,
`player_achievements` and `player_milestones` on a **Free-plan project with no PITR** — that dump is
the only undo that will exist. And it must follow the deploy: run it while the old code is live and
badges re-earn against the retired emoji glyphs, because `BadgeMark` is on `dev` only.

---

## ✅ Question 1 — RESOLVED 2026-08-11: what "launch-ready" requires

**Launch is a soft launch** — a wider circle, no broadcast. The site is already publicly deployed,
so launch is an act of promotion, not a change in exposure; that framing is what made the checklist
finite. The full blocking/accepted split produced five tickets. Three have shipped:

- **`TICKET-06`** 2026-08-12 — the three unlaunched Games are hidden behind a **`hidden` registry
  state, orthogonal to `wip`**; hidden routes stay live and unlinked. **ADR 0022.**
- **`TICKET-07`** 2026-08-12 — `/privacy` in Greek, one drawer link, and the Feedback payload cut to
  two fields (FormSubmit was already an unmentioned third-party processor).
- **`TICKET-08`** 2026-08-12 — **ADR 0023**: no third-party error SDK. The check is
  `npx vercel logs --environment production --level error --since 24h`, daily for the first week
  then weekly, proven against a real induced error. Two of that ticket's own claims failed
  measurement — the Vercel **MCP connector 403s on every project-scoped call** so the CLI is the
  only working surface, and **previews are SSO-protected** so the proof had to run read-only
  against production.

### Accepted as-is — do not re-open without new evidence

- **Terms of service** — not written. No payments, no lockable accounts, no user-to-user messaging.
  Revisit if money or public user-generated content enters.
- **E2E coverage** — the gate is `npm run test -- --run` and `npm run test:e2e` both green on the
  merge commit, not a bigger suite. `ISSUE-03`.
- **Disaster-recovery backups** — `ISSUE-01`. Automation and the dev/prod split are not launch work.
- **Content supply for the three hidden Games** — moot while they are hidden. Leksindeseis's static
  fallback is **one** puzzle rotating over a single-item array; Πόσο κάνει; and Λογοπαίγνιο hold one
  placeholder each.
- **API rate limiting** — the accepted risk in `reflections.md` stands.
- **Λογοπαίγνιο's trademark question** — the Game is hidden, so nothing visible needs an answer.

---

## Open question 2 — Sequence the launch run

Given everything above, what is the committed order of work to the go/no-go, and the honest calendar
estimate? Asked by the operator on 2026-07-31: *"set an order for tasks, create tickets ready for
agent pickup."*

**When this closes, the destination is reached** — the remaining work is execution against a known
list and the go/no-go is a scheduling call.

### Inputs

- The pending inventory at the top of this document — three tickets, three owed items
- `dev` is **15 commits ahead** of both `origin/dev` and `main` (measured 2026-08-12), so the merge
  is a real push and build, not a button press
- **No ordering constraints survive between the tickets.** The `TICKET-08`-before-`TICKET-07`
  coupling was withdrawn once the no-SDK ruling made it moot; both shipped. The one live dependency
  is **platform logo → `TICKET-10`**
- The UI redesign runs in parallel on operator sessions and is deliberately **not an input** — it
  cannot block this, and if it turns out to, that is a new decision rather than a known one

### Output

1. **An ordered list**, each item pointing at the decision that authorised it.
2. **The `dev → main` merge** placed explicitly, with its play-through.
3. **What is consciously *not* being done before launch**, written down, so it does not silently
   resurface as a blocker.

### Then

Update `goals.md` — the North Star gets a launch phase and "Current Focus" names it. Delete this
handoff. **`logopaignio-content-pool.md`, `engagementEpic.md`, `HANDOFF-monetization.md`,
`offlineFeature-handoff.md` and `game-icon-system.md` all stay** — deferred, parked or out of scope,
none of them done.

---

## Out of scope

- **The UI question** — tweaks vs redesign, and the three deferred UI decisions (full-bleed vs padded
  headers, real accents for stavrolekso/leksikastirio, tokenising `FeedbackBanner`). Operator-driven.
- **Λογοπαίγνιο content pool** and **Πόσο κάνει; content** — both Games are hidden.
- **The engagement epic** and **monetization entirely**.

---

## Decisions already made

Launch-relevant only. Everything else this document once carried has landed in an ADR and was
removed on 2026-08-12 — the achievement-catalog rebuild is **ADR 0013**, the Topothesies answer-set
work is **ADR 0018's Amendments**, and Offline Mode's park is **ADR 0010** plus its own handoff.

- **2026-08-12 — Error monitoring is Vercel-only, no SDK** (`ADR 0023`). Dissolved the privacy-page
  coupling rather than reordering around it. Reversing the ruling means revising `/privacy` in the
  same branch.
- **2026-08-12 — `hidden` is a second presentation state, not a synonym for `wip`** (`ADR 0022`).
  `wip` = unfinished; `hidden` = deliberately not shown. Hidden routes stay live.
- **2026-08-12 — The alert the rate-limiting decision assumed cannot be built.** Supabase tracks no
  row-count metric on any plan, and Free has no configurable threshold alert at all. Substitution is
  one SQL read folded into the ADR 0023 habit; the binding constraint is **database size**, because
  Free goes READ-ONLY above 500 MB with no grace period. Measured: 13 MB of 500, 8 auth MAU of
  50 000, 22 of 60 connections idle.
- **2026-08-11 — Question 1 resolved.** Soft launch. Two facts the grill measured rather than
  assumed: Leksindeseis's "thin" fallback pool is a **single** placeholder puzzle, and the Platform
  had **no legal surface and no monitoring of any kind**.
- **2026-08-06 — Monetization is off the launch path, nothing built.** Blocked on human work and
  gates no go/no-go. No code ever existed.

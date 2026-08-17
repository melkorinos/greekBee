# ADR 0023 — Error monitoring is Vercel's built-in observability, and nothing else

**Status:** accepted (2026-08-12)
**Decided by:** the operator, 2026-08-12, during the `TICKET-07` grill
**Depends on this:** [`/privacy`](../../src/app/privacy/page.tsx) — its "no tracking tools" claim is true
*because* of this decision, not independently of it.

## Context

The Platform had no monitoring of any kind. Production dependencies are exactly four — `next`,
`react`, `react-dom`, `@supabase/supabase-js`: no Sentry, no analytics, no Speed Insights. A failure
surfaced in exactly two ways: a player mentioning it, or the operator opening the Vercel dashboard
and looking.

That was survivable at roughly eight players a day, all known personally. A soft launch breaks the
feedback loop — a stranger who hits a 500 leaves and never says anything. The failure mode this
guards against is not a dramatic outage; it is **a route quietly throwing for a week while nobody
opens the dashboard**.

The repo's standing lesson applies directly: **green gates say nothing about production.**
`reflections.md` records the `player_milestones` window, where five live-DB tests went green the
moment a migration landed and were structurally blind to whether the accompanying deploy had
happened at all. Monitoring is the instrument that answers that question.

## Decision

**No third-party error SDK. Vercel's built-in observability only.**

Three reasons, in the order they actually carried weight:

1. **A third-party error monitor is a third-party processor.** Installing one forces a privacy-page
   rewrite and raises a consent question the Platform currently does not have to answer at all.
   `/privacy` states plainly that there are no analytics or tracking tools; this decision is what
   keeps that sentence true.
2. **A client-side error SDK is JavaScript on every page load**, and `soul.md` names Vercel Fluid
   Active CPU as the primary cost constraint. The Platform spent real sessions removing work from
   the hot path; adding an unconditional bundle back contradicts that.
3. **Vercel Pro is already paid for.** "Already there" beats "one more dependency".

## What the observability surface actually is — measured, not assumed

`TICKET-08` asserted that `get_runtime_errors` and `get_runtime_logs` "are reachable from an agent
session via MCP". **That was false when checked on 2026-08-12**, and the decision's third reason
rested on it, so it is recorded here rather than quietly fixed:

- The Vercel MCP connector authenticates and `list_teams` works, but **every project-scoped call
  fails** — `get_project` → 404 (with the slug *and* the `prj_…` id), `get_runtime_errors` and
  `get_runtime_logs` → **403 Forbidden**, `list_projects` → `[]`. Re-running the claude.ai
  authorization flow did not change it.
- **The Vercel CLI is the working surface**, and it is a full one. `npx vercel logs` without
  `--follow` runs a *historical* query supporting `--since` / `--until`, `--level`, `--status-code`,
  `--query`, `--environment`, `--json` and `--expand`. (The `project-mcp` skill previously recorded
  the opposite — "live-streams from now, no lookback" — and has been corrected.)
- **Retention reaches at least 7 days**, verified by walking `--since 7d --until 6d` back through
  real ISO timestamps to 2026-08-06.
- **Preview deployments cannot be reached by an agent.** A preview URL returns **302** to Vercel SSO
  while production returns 200. Anything that must be *exercised* on a preview needs the operator's
  logged-in browser.

Two consequences follow. The channel this decision actually buys is **runtime logs filtered by level
and status code**, not the aggregated "runtime errors" panel — that panel exists in the dashboard but
is not reachable from an agent session at all. And **the operator is the only party who can run the
check on a preview**; an agent can run it against production.

## The manual check that replaces an alerting tool

Vercel does not notify. Nothing here pushes; it all pulls. So the check is a habit, and a vague
"look at the dashboard sometimes" is what the Platform already had and is not a close.

**Run this, from the repo root:**

```bash
npx vercel logs --environment production --level error --since 24h --expand
```

**Cadence:** daily for the first week after launch, then weekly. The window must be **shorter than
the ~7-day retention**, or a fault can age out unseen — `--since 24h` daily, or `--since 7d` if a
check was missed.

**What a healthy result looks like — the baseline, measured 2026-08-12:**

- `No logs found` is the healthy answer. Production ran a full 7-day window with **zero `error`-level
  lines and zero 5xx**.
- Normal volume is **~1000+ log rows/day**, dominated by `POST /api/game-state` and
  `POST /api/game-scores` (~450 each) plus `GET /`, all `200`/`304`. That is the continuous
  score-post lane, not an anomaly.
- Because the floor is genuinely zero, **any `error` row or any 5xx is a real signal here, not
  noise.** That is what makes a check this cheap worth running.

**Two traps that will otherwise make the check lie:**

- **`No logs found` is ambiguous** — it means "nothing matched", which reads identically to "the
  query is broken". Re-run unfiltered over the same window before concluding the site is healthy.
  This is the standing *measure the artifact* rule applied to a negative result.
- **The human-readable output prints time-of-day with no date**, so two different days look
  identical. Use `--json` and parse `timestampInMs` whenever the date matters. Relatedly `--limit`
  truncates newest-first rather than windowing: `--since 7d --limit 1000` returned 1000 rows all
  from a single day.

**Prerequisite:** the repo must be linked, or the flag forms have no project context. `.vercel/` is
gitignored, so write it directly — no prompt, no network:

```json
{"projectId":"prj_HNH0oGZw3o7taDayCAtVe7BViOFl","orgId":"team_AUMxvbaDutPq8SMboMcf4sED"}
```

## Verification — the check was walked through, not just written

Per the standing rule that this ticket cannot close on having written a document, a real failure was
induced and then retrieved.

A read-only `GET /api/community-puzzles/stavrolekso/abc-not-a-number` was sent to production at
`2026-08-12T08:31:46Z`. The route casts the id with `Number(id)`, so a non-numeric segment reaches
Postgres as `NaN`, the integer cast is rejected, and `jsonError("not_found", detail)` logs the
detail server-side while returning a clean `{"error":"not_found"}` 404 to the caller. No writes, no
data change — indistinguishable from a stray bad request.

It surfaced, and the check retrieved it:

```
11:31:43.77  greek-bee.vercel.app  error  ε GET /api/community-puzzles/stavrolekso/abc-not-a-number
[api] not_found: invalid input syntax for type integer: "NaN"
```

**What this proves and what it does not.** It proves the whole chain — a fault in deployed code
reaches Vercel, is retained, is retrievable by level, and names the failing route. It does **not**
prove the aggregated runtime-errors panel, which is unreachable from an agent session, and it was a
*handled* error rather than an unhandled crash.

That gap is narrower than it looks, and the reason is worth recording: **no route in this codebase
can be made to crash from outside.** ADR 0016's envelope converts malformed input into coded 4xx
responses and routes every Postgres failure through `jsonError`, which logs the detail and returns a
stable code. Inducing an uncaught exception would have meant deploying a route that exists only to
throw. The envelope working as designed is why the strongest available proof is a handled error —
that is good news about the code, recorded so a future session does not read the gap as laziness.

## Consequences

- **`/privacy` and this decision are coupled, and the coupling outlived the ticket ordering.** The
  original plan sequenced `TICKET-08` before `TICKET-07` because installing a monitor would falsify
  the privacy page. Once the SDK was ruled out the dependency dissolved and both tickets shipped
  independently. **If this decision is ever reversed, `/privacy` must be revised in the same
  branch** — the page names its own load-bearing inputs in a header comment, and this ADR is one.
- **`privacyPage.test.tsx` pins the four production dependencies**, so an `npm install` fails the
  suite pointing at the privacy page. That test is the enforcement mechanism for this ADR; it was
  written for `TICKET-07` and it guards this decision too.
- **The check is a habit with no gate behind it.** Nothing in CI runs it and nothing can — it reads a
  live external service. It will decay silently if it decays, exactly like the Supabase row-count
  alerts (now in `CONTEXT.md`) that were decided and apparently never configured. `TICKET-09` closes
  that adjacent gap; this one has no such backstop.
- **`npm install` was explicitly out of scope** and remains so. Adding an error SDK is not a
  dependency decision, it is a reversal of this ADR plus a privacy-page revision.

## Alternatives rejected

- **Sentry (or any hosted error SDK).** The capable, conventional answer, and rejected on the privacy
  ground rather than on cost or effort. It would make the Platform a data controller shipping user
  data to a US-headquartered processor, replacing a page that currently says "nobody else sees this,
  with one exception" with one that needs a processor list and probably a consent dialog. For a free
  Greek word game with single-digit daily players, buying stack traces with a consent banner is the
  wrong trade. Revisit if traffic grows enough that unattended failures cost real players.
- **Doing nothing at all.** The status quo, and genuinely defensible for eight known players — they
  simply told the operator. It fails at exactly the moment the soft launch creates: a stranger who
  hits an error is silent. Rejected because the launch is what changes the premise.
- **Self-hosting an error collector** (GlitchTip, or an endpoint writing to Supabase). No third
  party, so the privacy page survives — but it adds a table, a route, a retention rule and a
  disclosure line to the very page the decision exists to protect, and it puts error collection in
  the same Postgres whose failure it would need to report. Strictly more machinery than reading the
  logs already being written.
- **A cron job polling the Vercel API and emailing on errors.** The honest middle option, and the one
  to reach for first if the manual check decays. Rejected *for now* only because it needs a token, a
  scheduler and a mail path — three new failure points guarding a system that has produced zero
  errors in seven days. The Vercel SDK documents this pattern if it becomes worth building.

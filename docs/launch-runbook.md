# Launch runbook — the committed order to the go/no-go, and release day itself

**Decided:** 2026-08-20 · **Driver:** Dimitrios · **Target: on or about 27 August 2026**, one week
out, explicitly **not hard** — a shape for planning, and slipping it costs nothing.

This file replaces `.claude/handoffs/launch-readiness.md`, deleted the same day when its last open
question — *sequence the launch run* — was answered below. Launch is a **soft launch**: the site is
already publicly deployed, so this is an act of promotion, not a change in exposure. That framing is
what made the checklist finite (question 1, resolved 2026-08-11).

Delete this file once the launch has happened and the first week's error checks are clean.

---

## The run — in order

1. **The offsite backup — DONE 2026-08-20** (`TICKET-11`, closed, file deleted). The password is in
   a password manager, the Drive folder exists and is private, and `20260820-112045.7z` is uploaded
   to it. Two things survive into [`ISSUE-01`](../.claude/tracker/issues/ISSUE-01-no-disaster-recovery-backups.md)
   §1 rather than holding this step open: **the weekly task is still unregistered**
   (`npm run db:backup:schedule-weekly` — nothing to block it any more, so do it), and the archive
   has **never been extracted on a different machine**, which is the only test that proves the
   stored password opens it. Neither gates release-day step 3, which takes a fresh dump anyway.
2. **The Round-End Result Panel — DONE 2026-08-20** (ADR 0025). Six Games now end with a Result Panel
   and every share carries a link, which is what `TICKET-10`'s share card was waiting for. One thing
   is owed and no test can hold it: **open a Game's Result Panel on a real phone and press
   Κοινοποίηση**, to see the native share sheet rather than a clipboard copy.
3. **The `dev → main` merge**. Gate:
   `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` all green on the
   merge commit (`ISSUE-03` — the gate is the existing suite green, not a bigger one), plus the
   operator's preview play-through of `dev`, which is a habit rather than a tracked task (ruling
   2026-08-15). Re-measure the merge before planning the window: `git rev-list --count origin/dev..dev`.
4. **Release day** — the five steps below, in that order.
5. **The first week after** — `npx vercel logs --environment production --level error --since 24h`,
   daily for a week, then weekly (ADR 0023; there is no third-party error SDK, and the Vercel MCP
   connector 403s on project-scoped calls, so the CLI is the only working surface).

## Consciously not being done before launch — so it cannot resurface as a blocker

Terms of service (no payments, no lockable accounts, no user-to-user messaging — revisit if money or
public user-generated content enters) · growing E2E coverage (`ISSUE-03`) · a dev/prod project split
(**decided against**, ADR 0024; migration safety is `npm run db:rehearse`) · Offline Mode and its
manual device pass (parked, ADR 0010) · the game-icon system (`.claude/handoffs/game-icon-system.md`,
nothing designed) · the UI redesign (operator-driven, separate sessions) · content for the three
`hidden` Games (ADR 0022 — moot while hidden, and that includes Λογοπαίγνιο's trademark question) ·
the nominations moderation half (`ISSUE-01` §3) · API rate limiting (the accepted risk in
`CONTEXT.md`, *Persistence decisions*) · automating the backup upload (needs a Drive credential on
the machine; nobody has made that call).

---

## Release day — the order is load-bearing

1. **Merge `dev → main` and deploy.**
2. **Verify production is serving the merge commit** — the deploy, not the migration; `reflections.md`
   records that live-DB tests go green on a migration alone and are blind to whether the deploy
   happened. **Then look at the share preview on the same deploy**: request `/favicon.ico` (browsers
   and several scrapers ask for that path whatever the `<link>` tag says), check the tab icon, and
   post the production link into Messenger or Viber and look at the card. This is all that was left of
   `TICKET-10`. A preview deploy cannot substitute — previews are SSO-protected and answer 302, so
   scrapers, which carry no session, fetch the login page or nothing.
3. **`npm run db:backup`, then upload `db-backups/<timestamp>.7z`** — the encrypted archive, not the
   folder — to the private Drive folder. The script refuses to run without `BACKUP_ARCHIVE_PASSWORD`,
   so the remaining risk is human: **the upload is manual and nothing enforces it.** A dump still
   sitting on the machine at step 4 means the wipe has no undo.
4. **`supabase/scripts/launch-reset.sql`**, by hand in the dashboard.
5. **Announce.**

Steps 3 and 4 are why the order matters. The reset empties `game_scores`, `game_state`,
`player_achievements` and `player_milestones` on a **Free-plan project with no PITR** — that archive
is the only undo that will exist. And it must follow the deploy: run it while the old code is live
and badges re-earn against the retired emoji glyphs, because `BadgeMark` is on `dev` only.

**There is no longer a schema step here, and that is deliberate.** Everything the schema was owed —
both dropped community queues, `game_scores.data`, `is_perfect`, and `ISSUE-01` §3’s index and sigma
fix — ships **before** release day in
`supabase/migrations/20260820120000_drop_two_community_queues_and_dead_score_columns.sql`
(ADR 0027 §5). That step existed only because `supabase/migrations/` was frozen to buy one thing: DDL
against an empty `game_scores`. Dropping the now-dead `data` column **spends** that guarantee, so
running DDL twice buys nothing, and the risk is answered by mechanism instead of timing —
`npm run db:backup` then `npm run db:rehearse` (ADR 0024), which replays the pending queue against a
real restored archive. The one ordering rule that survives is outside this list: the migration must
not run until the code that stopped writing those tables is **live in production**.

**The dump never enters a git repository** — settled 2026-08-15. This repo is public,
`scripts/backup-db.ps1` writes to `db-backups/`, and `.gitignore` line 46 already reads *"local DB
backups — never commit"*. `pg_dump` without a schema filter carries `auth.users`, so a committed dump
would publish account identifiers and display names permanently; git history keeps them after a
delete. **That ignore rule is load-bearing — never remove it, never `git add -f` around it.** Two
copies beat one, so an external disk is worth the trouble.

---

## References

- `.claude/tracker/tickets/` — read the folder, never a list here. The folder is the state: a file on disk is open work, a deleted file is done.
- [`ISSUE-01`](../.claude/tracker/issues/ISSUE-01-no-disaster-recovery-backups.md) · [`ISSUE-03`](../.claude/tracker/issues/ISSUE-03-thin-e2e-coverage.md) — the two deferred problems this run deliberately does not close.
- [`docs/disaster-recovery.md`](disaster-recovery.md) — the backup and restore procedure step 3 depends on.
- ADRs [0022](adr/0022-hidden-is-not-wip.md) (hidden Games), [0023](adr/0023-error-monitoring-is-vercel-only.md) (error checks), [0024](adr/0024-no-dev-prod-split-migration-safety-is-local.md) (no split), [0025](adr/0025-round-end-result-panel-and-share.md) (Round End + share, built 2026-08-20).

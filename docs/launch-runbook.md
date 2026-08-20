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

1. **`TICKET-11`, operator half — first, and not on the day.** Password into a password manager,
   private Drive folder, fresh archive, upload, **extract it on a different machine**, then register
   the weekly task. The ticket carries the seven steps and why that order. This gates release-day
   step 3, and an untested password is the wipe's only undo failing at the moment it is needed.
2. **`TICKET-15` — the Round-End Result Panel** (ADR 0025), in progress in a separate session. It is
   the only remaining agent work and the only item that makes the launch *spread*: `TICKET-10`
   shipped the share card, and nothing on the Platform posts a link for it to render. **It does not
   gate the date.** If it is not green by the target, launch without it — it costs reach, not
   stability, and its slice 5 (Λεξόκηπος) is deliberately ordered last so the other five ship whole.
3. **The `dev → main` merge**, once `TICKET-15` is in or consciously dropped. Gate:
   `npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` all green on the
   merge commit (`ISSUE-03` — the gate is the existing suite green, not a bigger one), plus the
   operator's preview play-through of `dev`, which is a habit rather than a tracked task (ruling
   2026-08-15). Re-measure the merge before planning the window: `git rev-list --count origin/dev..dev`.
4. **Release day** — the six steps below, in that order.
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
5. **One migration, three statements.** The table is empty as of step 4, so this is the one moment
   the DDL cannot cost anything. Do not compose it on the day:

   ```sql
   -- supabase/migrations/<YYYYMMDD>120000_drop_is_perfect_from_game_scores.sql
   alter table public.game_scores drop column if exists is_perfect;

   -- ISSUE-01 §3: GET /api/nominations/lookup matches no index and scans the table
   -- on every nomination-modal open. ~2 MB at 50,000 rows. Needs no empty table and
   -- no types regeneration — nominations survives step 4.
   create index if not exists nominations_word_direction_status_idx
     on public.nominations (word, direction, status);

   -- ISSUE-01 §3: the one non-normalised row in 191. Final sigma, so a re-proposal
   -- normalises to ιουνιοσ and its prior-rejection warning can never fire.
   update public.nominations set word = 'ιουνιοσ'
    where word = 'ιουνιος' and direction = 'remove';
   ```

   **`npm run db:rehearse` first** — it replays the queue against the archive taken at step 3, the
   only rehearsal this project's highest-stakes migration will get — then `npx supabase db push`, then
   regenerate `src/lib/database.types.ts` and commit both together (ADR 0017: the generated types are
   trusted, so they cannot keep offering a column that is gone). **Nothing may enter
   `supabase/migrations/` before this step** — a committed-but-unpushed migration fires on the next
   unrelated `db push`, the same trap that keeps `launch-reset.sql` out of that folder. Verify with
   `select count(*) from information_schema.columns where table_schema='public' and
   table_name='game_scores' and column_name='is_perfect'` — must return 0. **This step does not gate
   the announce.** If the push fails, announce anyway and re-file; the column has never been read.
   Amend **ADR 0013** once the drop lands — its line stating the column is *kept* stops being true.
6. **Announce.**

Steps 3 and 4 are why the order matters. The reset empties `game_scores`, `game_state`,
`player_achievements` and `player_milestones` on a **Free-plan project with no PITR** — that archive
is the only undo that will exist. And it must follow the deploy: run it while the old code is live
and badges re-earn against the retired emoji glyphs, because `BadgeMark` is on `dev` only.

**The dump never enters a git repository** — settled 2026-08-15. This repo is public,
`scripts/backup-db.ps1` writes to `db-backups/`, and `.gitignore` line 46 already reads *"local DB
backups — never commit"*. `pg_dump` without a schema filter carries `auth.users`, so a committed dump
would publish account identifiers and display names permanently; git history keeps them after a
delete. **That ignore rule is load-bearing — never remove it, never `git add -f` around it.** Two
copies beat one, so an external disk is worth the trouble.

---

## References

- [`TICKET-11`](../.claude/tracker/tickets/TICKET-11-offsite-encrypted-backup-launch.md) · [`TICKET-15`](../.claude/tracker/tickets/TICKET-15-round-end-result-panel-launch.md) — the two open tickets.
- [`ISSUE-01`](../.claude/tracker/issues/ISSUE-01-no-disaster-recovery-backups.md) · [`ISSUE-03`](../.claude/tracker/issues/ISSUE-03-thin-e2e-coverage.md) · [`ISSUE-05`](../.claude/tracker/issues/ISSUE-05-dead-is-perfect-column-launch.md) — deferred, and step 5's DROP.
- [`docs/disaster-recovery.md`](disaster-recovery.md) — the backup and restore procedure step 3 depends on.
- ADRs [0022](adr/0022-hidden-is-not-wip.md) (hidden Games), [0023](adr/0023-error-monitoring-is-vercel-only.md) (error checks), [0024](adr/0024-no-dev-prod-split-migration-safety-is-local.md) (no split), [0025](adr/0025-round-end-result-panel-and-share.md) (`TICKET-15`).

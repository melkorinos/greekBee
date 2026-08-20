# Launch readiness — what is left between here and a go/no-go

**Created:** 2026-07-31 · **Question 1 resolved:** 2026-08-11 · **Cut to current state:** 2026-08-20
**Driver:** Dimitrios

One question is left. Everything else has shipped, been consciously accepted, or moved somewhere with
a better home; the resolved history that used to live here is in `log.md` and the ADRs, which own it.
When question 2 closes, delete this handoff.

**Destination:** nothing open stands between here and pressing the button. Reaching it does not
require the launch to have happened. The date stays the operator's.

**How to work this document:** read `CLAUDE.md`, then `soul.md`, `memory.md`, `goals.md`,
`reflections.md`, `log.md`. **This document plans; it does not build** — `/to-tickets` turns a
resolved question into slices, `/tdd` builds them, `/project-mcp` comes before any Supabase or Vercel
MCP call. **Never `git push`.**

---

## Everything still pending

| Item | What is left | Owner |
|---|---|---|
| `TICKET-11` | Backup setup — Drive folder, a real password in a password manager, and one archive proven to extract **on another machine**. The agent half shipped 2026-08-15. **The setup is pre-launch work, not launch-day work**: runbook step 3 depends on it, and an untested password is the wipe's only undo | operator |
| `TICKET-15` | Round-End Result Panel across six Games (**ADR 0025**) — the other half of `TICKET-10`, and the only launch item that makes the launch *spread* rather than merely not fail. **In progress in a separate session as of 2026-08-20** | agent, `/tdd` |
| The runbook | Below. The only owed item that is not a tracker file | operator |

Nothing else is open. There is **no agent work left that can be done before launch** beyond
`TICKET-15`: runbook step 5's migration is written out already and `supabase/migrations/` is frozen
until that step, and every other pending act is an operator one.

### Deferred, correctly, and not launch work

`ISSUE-01` (the DB file — backups, profile scans, nominations growth; reduced here to one runbook
line), `ISSUE-03` (thin E2E coverage), and the hidden Games' content supply. **`ISSUE-05` is not in
this list** — it is scheduled, at runbook step 5. **Offline Mode is not launch work** — removed here
2026-08-20 by operator ruling; it stays parked in **ADR 0010** with its own handoff, and its manual
device pass is not a launch item. Do not re-file either of them here.

### Accepted as-is — do not re-open without new evidence

Terms of service (no payments, no lockable accounts, no user-to-user messaging — revisit if money or
public user-generated content enters) · E2E coverage (the gate is `npm run test -- --run` and
`npm run test:e2e` green on the merge commit, not a bigger suite) · API rate limiting (the accepted
risk in `CONTEXT.md`, *Persistence decisions*) · content supply for the three hidden Games ·
Λογοπαίγνιο's trademark question, moot while the Game is hidden.

### Tracked elsewhere — do not re-file here

**UI redesign** — operator-driven in separate sessions, untracked by design, and explicitly **not an
input** to question 2. **Game icons** — `.claude/handoffs/game-icon-system.md` + `goals.md` item 5.
**Platform logo and share card** — done; the mark is `src/app/_brand/fan.tsx` and there was never a
separate logo project. **Monetization and the engagement epic** — off the launch path entirely.

---

## The release-day runbook — order is load-bearing

1. Merge `dev → main` and deploy.
2. **Verify production is serving the merge commit** — the deploy, not the migration; `reflections.md`
   records that live-DB tests go green on a migration alone. **Then look at the share preview on the
   same deploy**: request `/favicon.ico` (scrapers ask for that path whatever the `<link>` tag says),
   check the tab icon, and post the production link into Messenger or Viber and look at the card. This
   is all that was left of `TICKET-10`. A preview deploy cannot substitute — previews are
   SSO-protected and answer 302, so scrapers carrying no session fetch the login page or nothing.
3. `npm run db:backup`, then upload `db-backups/<timestamp>.7z` — the **encrypted archive**, not the
   folder — to the private Drive folder. The script refuses to run without `BACKUP_ARCHIVE_PASSWORD`,
   so the remaining risk is human: **the upload is manual and nothing enforces it.** A dump still on
   the machine at step 4 means the wipe has no undo.
4. `supabase/scripts/launch-reset.sql`, by hand in the dashboard.
5. **Drop the dead `game_scores.is_perfect` column** — `ISSUE-05`, scheduled here and nowhere else.
   The table is empty as of step 4, so this is the one moment the DDL cannot cost anything. Do not
   compose it on the day:

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

   **`npm run db:rehearse` first** — it replays the queue against the archive from step 3, the only
   rehearsal this project's highest-stakes migration will get — then `npx supabase db push`, then
   regenerate `src/lib/database.types.ts` and commit both together (**ADR 0017**). **Nothing may enter
   `supabase/migrations/` before this step**: a committed-but-unpushed migration fires on the next
   unrelated `db push`. Verify with `select count(*) from information_schema.columns where
   table_schema='public' and table_name='game_scores' and column_name='is_perfect'` — must return 0.
   **This step does not gate the announce.** If the push fails, announce anyway and re-file. Amend
   **ADR 0013** once the drop lands — its line stating the column is *kept* stops being true here.
6. Announce.

Steps 3 and 4 are why the order matters. The reset empties `game_scores`, `game_state`,
`player_achievements` and `player_milestones` on a **Free-plan project with no PITR** — that archive
is the only undo that will exist. And it must follow the deploy: run it while the old code is live
and badges re-earn against the retired emoji glyphs, because `BadgeMark` is on `dev` only.

**The dump never enters a git repository** — settled 2026-08-15. This repo is public,
`scripts/backup-db.ps1` writes to `db-backups/`, and `.gitignore` line 46 already reads *"local DB
backups — never commit"*. `pg_dump` without a schema filter carries `auth.users`, so a committed dump
would publish account identifiers and display names permanently. **That ignore rule is load-bearing —
never remove it, never `git add -f` around it.** Two copies beat one.

---

## Open question 2 — Sequence the launch run

Given everything above, what is the committed order of work to the go/no-go, and the honest calendar
estimate? Asked by the operator on 2026-07-31: *"set an order for tasks, create tickets ready for
agent pickup."* **When this closes, the destination is reached** — the rest is execution against a
known list and the go/no-go becomes a scheduling call.

It has shrunk to a scheduling call with no unknowns left to stress-test. Two inputs are still owed by
the operator: **the target date shape**, and **whether the merge waits for `TICKET-15`**.

### Inputs

- The table above — two tickets and the runbook. **No ordering constraints survive between the
  tickets**; the last one dissolved 2026-08-15. Only `TICKET-11`'s operator half gates anything, and
  what it gates is runbook step 3.
- **The calendar estimate is the operator's: roughly 3–4 weeks from 2026-08-15**, so a go/no-go around
  **4–11 September 2026**. Explicitly **not hard** — a shape for planning, and slipping costs nothing.
  What it does settle is that nothing here may grow into a multi-month project without a new decision.
- **Re-measure the merge before planning the window** rather than reading a stale count:
  `git rev-list --count origin/dev..dev`.

### Output

1. **An ordered list**, each item pointing at the decision that authorised it.
2. **The `dev → main` merge** placed explicitly, with its play-through.
3. **What is consciously *not* being done before launch**, written down, so it cannot silently
   resurface as a blocker.

### Then

Update `goals.md` — the North Star gets a launch phase and "Current Focus" names it. Delete this
handoff. **`logopaignio-content-pool.md`, `engagementEpic.md`, `HANDOFF-monetization.md`,
`offlineFeature-handoff.md` and `game-icon-system.md` all stay** — deferred, parked or out of scope,
none of them done.

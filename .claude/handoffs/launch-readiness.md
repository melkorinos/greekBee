# Launch readiness — what is left between here and a go/no-go

**Created:** 2026-07-31 · **Question 1 resolved:** 2026-08-11 · **Last audit:** 2026-08-15
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

Audited against the filesystem and git on 2026-08-14, re-cut against the operator's rulings of
2026-08-15. Nothing else is open.

### Open tickets — `.claude/tracker/tickets/`

| Ticket | What is left | Owner |
|---|---|---|
| `TICKET-05` | **Split, and no longer a deploy blocker. Part A shipped 2026-08-15** — the 🔊 toggle is behind `FEATURE_FLAGS.soundCues`, off, with the machine wired and inert beneath it. What is left is Part B: the three MP3s, **post-launch and optional**, ending in the flag flip | operator, no date |
| `TICKET-11` | **New 2026-08-15, agent half shipped the same day.** `npm run db:backup` now emits an AES-256 `.7z` and refuses to run unprotected; `docs/disaster-recovery.md` carries the restore order. What is left is **operator-only**: create the private Drive folder, set and safely store `BACKUP_ARCHIVE_PASSWORD`, and prove one archive extracts on another machine. Must be done **before** runbook step 3 is executed | operator |
| `TICKET-15` | **New 2026-08-17, nothing built.** Every Game gets a Result Panel at its Round End, sharing a four-line summary and a link (**ADR 0025**). This is the other half of `TICKET-10`: that card renders when a link is posted and nothing on the Platform posts one today. The only launch item that makes the launch *spread* rather than merely not fail — so it is a real input to question 2's ordering, not a nice-to-have appended after it | agent, `/tdd` |
| `TICKET-10` | **Code complete 2026-08-16. The pick is made and the platform logo now exists** — card 18 and icon 1, built from one shared mark so the favicon cannot drift from the card. `opengraph-image`, `icon`, `apple-icon`, the stock `favicon.ico` deleted, and a guard test that *renders* the images rather than matching source. All four gates clean; all three images prerender static. **Nothing is pending but a look:** the card has to be seen in a real scraper, which cannot happen before a deploy. It is not a separate task — it rides runbook steps 1–2 | operator, at deploy |

### Owed, and not tickets

- **The release-day runbook** below. It is the only owed item left.

The preview play-through is **no longer tracked here** (operator ruling, 2026-08-15): the operator
tests every branch on preview as a matter of course, so writing it down was bookkeeping of a habit
rather than a piece of pending work. The `TICKET-03` visual eye-checks ride along with that habit.

### Deferred, correctly, and not launch work

`ISSUE-01` (**the DB file** — backups, plus profile scans and nominations growth folded in on
2026-08-16; the dev/prod split is no longer among them, decided against in **ADR 0024** on the same
day, and the unread score metadata was fixed rather than folded; reduced here to one runbook line),
`ISSUE-03`
(thin E2E coverage), Offline Mode's manual device pass (`offlineFeature-handoff.md`), and the hidden
Games' content supply. **`ISSUE-05` is not in this list** — it is scheduled, at runbook step 5.

### Tracked elsewhere — do not re-file here

- **UI redesign** — operator-driven in separate sessions. Untracked by design.
- **Game icons** — `.claude/handoffs/game-icon-system.md` + `goals.md` item 5. Nothing designed;
  that handoff exists to make a grill productive and is expected to produce a ticket.
- **Platform logo** — **done 2026-08-16, and no longer pending anywhere.** Folded into `TICKET-10`
  on 2026-08-15 on the ruling that the icon the operator picks *is* the mark; the operator picked
  icon 1 the next day and it shipped as `src/app/_brand/fan.tsx`. There was never a separate logo
  project and there is no placeholder to revisit. Do not re-file it here.

---

## The release-day runbook — order is load-bearing

1. Merge `dev → main` and deploy.
2. **Verify production is serving the merge commit.** Not the migration, the deploy —
   `reflections.md` records that live-DB tests go green on a migration alone and are blind to
   whether the deploy happened.
3. `npm run db:backup`, then upload `db-backups/<timestamp>.7z` — the **encrypted archive**, not the
   folder — to the private Google Drive backup folder. The script builds the archive as of
   2026-08-15 (`TICKET-11`) and refuses to run without `BACKUP_ARCHIVE_PASSWORD`, so the remaining
   risk is human: **the upload is manual and nothing enforces it.** A dump still sitting on the
   machine at step 4 means the wipe has no undo.
4. `supabase/scripts/launch-reset.sql`, by hand in the dashboard.
5. **Drop the dead `game_scores.is_perfect` column** — `ISSUE-05`, which is scheduled here and
   nowhere else. The table is empty as of step 4, so this is the one moment the DDL cannot cost
   anything. Do not compose it on the day; the body is written out already:

   ```sql
   -- supabase/migrations/<YYYYMMDD>120000_drop_is_perfect_from_game_scores.sql
   alter table public.game_scores drop column if exists is_perfect;
   ```

   Copy that into a new file under `supabase/migrations/`, `npx supabase db push`, then regenerate
   `src/lib/database.types.ts` and commit both together (ADR 0017 — the generated types are trusted,
   so they cannot keep offering a column that is gone). **Nothing may enter `supabase/migrations/`
   before this step** — a committed-but-unpushed migration fires on the next unrelated `db push`,
   which is the same trap that keeps `launch-reset.sql` out of that folder. The types commit needs no
   deploy of its own; it rides whatever deploy comes next, since nothing selects the column.

   ```sql
   -- verify: must return 0
   select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'game_scores'
      and column_name = 'is_perfect';
   ```

   **This step does not gate the announce.** If the push fails, announce anyway and re-file — the
   column has never been read, so leaving it costs exactly what it costs today. Amend ADR 0013 once
   the drop lands: its line stating the column is *kept* stops being true here.
6. Announce.

Steps 3 and 4 are why the order matters. The reset empties `game_scores`, `game_state`,
`player_achievements` and `player_milestones` on a **Free-plan project with no PITR** — that dump is
the only undo that will exist. And it must follow the deploy: run it while the old code is live and
badges re-earn against the retired emoji glyphs, because `BadgeMark` is on `dev` only.

**Where the dump goes — settled 2026-08-15, and the answer is not the repo.** Committing it to a
second private repository was considered and rejected: **this repository is public**, `scripts/backup-db.ps1`
already writes to `db-backups/`, and `.gitignore` line 46 already reads *"local DB backups — never
commit"*. `pg_dump` without a schema filter carries `auth.users` alongside gameplay, so a committed
dump would publish account identifiers, device UUIDs and display names permanently — git history
keeps them after a delete. The destination is any private store that is not GitHub: cloud drive,
external disk, encrypted archive. Two copies beat one. **The `db-backups/` ignore rule is
load-bearing — never remove it**, and never override it with `git add -f`.

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
- **Disaster-recovery backups** — `ISSUE-01`. The dev/prod split is **decided against** (ADR 0024,
  2026-08-16) and migration safety moved to `TICKET-13`'s local rehearsal; neither is launch work.
  **What *is* launch work is runbook step 3, and it currently cannot run** —
  `BACKUP_ARCHIVE_PASSWORD` is absent from `.env.local`, so `npm run db:backup` throws. That is
  `TICKET-11`'s operator half, already listed above.
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

- The pending inventory at the top of this document — three tickets, one owed item
- **The calendar estimate is the operator's: roughly 3–4 weeks from 2026-08-15**, putting the
  go/no-go around **4–11 September 2026**. The date is explicitly **not hard** — it is a shape for
  planning, not a commitment, and slipping it costs nothing. What the estimate does settle is that
  no item on this document is allowed to grow into a multi-month project without a new decision
- `dev` is **1 commit ahead** of `origin/dev`, `main` and `origin/main` (measured 2026-08-14; it was
  15 on 2026-08-12 and the backlog has since been pushed). **Re-measure before planning the window
  rather than reading this line** — `git rev-list --count origin/dev..dev`. The merge is still a real
  build, but it is no longer a large backlog
- **No ordering constraints survive between the tickets at all**, as of 2026-08-15. The
  `TICKET-08`-before-`TICKET-07` coupling was withdrawn once the no-SDK ruling made it moot; both
  shipped. The last one, **platform logo → `TICKET-10`**, dissolved when the logo moved *inside*
  `TICKET-10`. **As of 2026-08-16 only one operator act gates anything at all** — `TICKET-11`'s
  backup setup, which runbook step 3 depends on. `TICKET-10`'s pick is spent, and its one open box
  is a look at the deployed card, which the merge itself provides
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

- **2026-08-15 — Sound Cues are post-launch and optional; the toggle is flag-gated instead.**
  `TICKET-05` no longer blocks a deploy. The agent hides the 🔊 button behind
  `FEATURE_FLAGS.soundCues`; the MP3s land whenever they land and flip it on. Reversing this means
  the launch waits on three audio files again.
- **2026-08-16 — The mark is card 18 and icon 1: three letter tiles fanned out, Ω Λ π.** Chosen by
  the operator from the round-two candidates page and shipped the same session, with a **12 KB
  subset of Inter Bold committed** (`src/app/_brand/Inter-Bold-subset.ttf`) once the first render
  showed the mark coming out regular rather than bold — `ImageResponse` bundles a single-weight
  face. The **~350 KB font price this document had been quoting was for full Greek coverage** and
  made a font look unaffordable; the mark needs the Latin alphabet plus six Greek glyphs, which the
  Google Fonts `text=` parameter cuts to a twenty-eighth of that. A missing glyph in a subset renders
  as nothing, so a test reads the font's `cmap` and fails rather than shipping a gap.
- **2026-08-15 — The platform logo is `TICKET-10`'s icon pick, not a project.** Removes the last
  cross-item dependency on this document. **Discharged 2026-08-16** by the ruling above.
- **2026-08-15 — The preview play-through leaves this document.** The operator tests every branch on
  preview by habit; tracking it here recorded a routine rather than a task.
- **2026-08-15 — The release-day dump never enters a git repository.** The repo is public and
  `db-backups/` is already ignored; the dump carries `auth.users`. The destination is an encrypted
  7-Zip archive in a **private Google Drive folder** — `TICKET-11`, which also closes half of
  `ISSUE-01`. The dump keeps the email addresses rather than stripping the `auth` schema: a
  public-schema-only dump restores rows whose `auth_user_id` points at accounts that no longer
  exist, which is not a restore. Encryption protects them, deletion would break them.
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

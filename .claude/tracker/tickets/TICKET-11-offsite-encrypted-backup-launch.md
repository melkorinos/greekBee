# [LAUNCH] Get the release-day dump off the machine — encrypted, into Google Drive

**Status:** ready
**Spec:** [.claude/handoffs/launch-readiness.md](../../handoffs/launch-readiness.md) — the release-day
runbook, step 3 · [docs/disaster-recovery.md](../../../docs/disaster-recovery.md) ·
[ISSUE-01](../issues/ISSUE-01-no-disaster-recovery-backups.md)

## Why

`supabase/scripts/launch-reset.sql` empties `game_scores`, `game_state`, `player_achievements` and
`player_milestones` on a **Free-plan project with no automatic backups and no PITR**. The dump taken
at runbook step 3 is the only undo that will ever exist for that wipe — and today it lands in
`db-backups/<timestamp>/` on one Windows machine and stops there. A dump that lives only on the
machine that could die is not a backup; it is a copy.

The destination was decided on 2026-08-15: **an encrypted archive in Google Drive, never a git
repository.** This repository is public, `.gitignore` line 46 already reads *"local DB backups —
never commit"*, and `pg_dump` without a schema filter carries `auth.users` — so a committed dump
would publish player email addresses permanently, since git history survives a delete. The ignore
rule is load-bearing; this ticket must not weaken it or add a `git add -f` anywhere.

This closes **half of `ISSUE-01`** — the "somewhere to put the dumps" half. The dev/prod project
split stays deferred there and is explicitly **not** in this ticket's scope.

## The emails stay in the dump — decided, do not "fix" it

An earlier idea was to strip `auth.users` with `pg_dump --schema=public` so the archive holds no
email addresses at all. **Rejected.** The whole point of this artifact is disaster recovery, and a
public-schema-only dump restores gameplay rows whose `auth_user_id` columns point at accounts that
no longer exist — every signed-in player silently becomes a stranger to their own history. The
emails are what make the restore a restore. Protect them with encryption and a private destination
rather than by deleting them.

## Agent half — ✅ DONE 2026-08-15

`scripts/backup-db.ps1` now preflights 7-Zip alongside `pg_dump`, refuses to run without
`BACKUP_ARCHIVE_PASSWORD`, packs each backup folder into `db-backups/<timestamp>.7z` with
`-t7z -mhe=on`, prunes archives on the same keep-2 rule as the folders, and prints the upload
reminder. `.env.local.example` documents the three backup variables (two of which were previously
undocumented), and `docs/disaster-recovery.md` gained the destination rules and a three-file restore
order. eslint and build clean; no test — see the last done-when.

**What remains is the operator half below, and it is the half that makes the backup real.**

## Scope — built

- [x] **Add an archive step to `scripts/backup-db.ps1`**, after the three dumps and before the
      prune. Produce one password-protected archive of the timestamped folder —
      `db-backups/<timestamp>.7z`, AES-256, using 7-Zip (`7z a -t7z -mhe=on -p<password>`).
      `-mhe=on` matters: without it the filenames stay readable in the archive listing.
- [x] **Read the password from `.env.local`**, the same way `SUPABASE_DB_URL` and `PGPASSWORD` are
      read today (`BACKUP_ARCHIVE_PASSWORD`). Never a literal in the script, never on the command
      line in a way that lands in shell history. If the variable is missing, **throw with a clear
      message** rather than silently producing an unencrypted archive — a backup that is quietly
      unprotected is worse than one that failed loudly.
- [x] **Preflight for 7-Zip** exactly as the script already preflights `pg_dump`: look for
      `7z.exe`, fall back to PATH, and throw with the install command
      (`winget install 7zip.7zip`) if it is absent. Follow the existing error-message style.
- [x] **Keep the archive inside `db-backups/`** so the existing ignore rule covers it. Confirm with
      `git status --porcelain` that a fresh archive shows up as nothing at all.
- [x] **Extend the prune** to drop stale `.7z` files alongside the folders it already prunes — the
      current rule keeps the 2 most recent, and archives must not accumulate outside it.
- [x] **Print the next action** on success: the archive path and a one-line reminder to upload it to
      the Drive folder. The script does not upload — see below.
- [x] **Document the restore** in `docs/disaster-recovery.md`: how to extract the archive, and the
      order the three files go back in (`roles.sql`, `schema.sql`, `data.sql`). A backup nobody has
      read the restore procedure for is a guess.
- [x] **Update the runbook** step 3 in `launch-readiness.md` to name the archive and the upload as
      part of the step rather than as an implied "move it off the machine".

## Not in scope — deliberately

- **Uploading from the script.** That means a Google API credential on the machine and in
  `.env.local`, for a step the operator performs by hand a handful of times a year. Manual upload,
  automated encryption. Revisit only if the dump becomes scheduled rather than occasional.
- **A scheduler.** `db:backup:schedule-weekly` already exists; wiring it to Drive is `ISSUE-01`
  work. **Do not register the task until this ticket's operator half is done** — without
  `BACKUP_ARCHIVE_PASSWORD` the script throws, so the job would fail every Sunday unattended while
  looking like coverage.
- **The dev/prod project split.** **Decided against** — ADR 0024, 2026-08-16. Migration safety is a
  local rehearsal instead — `npm run db:rehearse`, shipped 2026-08-17 once the password was set and
  the first archive existed.

## Operator half — cannot be done by an agent

- [ ] Create the Drive folder and keep it **private** — not "anyone with the link".
- [ ] Choose the archive password and **store it somewhere that is not the machine being backed
      up and not `.env.local` alone** (a password manager). An encrypted archive whose password
      died with the laptop is a brick. **As of 2026-08-17 it is `ADMIN_SECRET` reused** — enough to
      unblock the rehearsal, not enough for the artifact that guards every player's email. Replace
      it before the first upload.
- [ ] Consider a second copy on an external disk. A cloud account you can lose access to is one
      point of failure wearing a different hat.

## Done when

- [x] `npm run db:backup` produces the three dumps **and** one encrypted `.7z`, and fails loudly
      when either the password or 7-Zip is missing. **Run 2026-08-17** — `20260817-123332.7z`.
- [x] `git status` is clean immediately after a backup run — no dump, no archive, nothing staged.
      **Verified 2026-08-17.**
- [ ] The archive has been opened once from Drive **on a different machine** and the password
      worked. Measure the artifact, not the response: a `.7z` that exists is the response, a `.7z`
      that extracts elsewhere is the artifact.
- [ ] `docs/disaster-recovery.md` carries the extract-and-restore steps.
- [ ] `npx eslint .` and `npm run build` clean. No test is expected — this is a PowerShell script
      outside the suite's reach, which is exactly why the done-when above is a manual extraction.

# Schedule the weekly backup, and prove the archive opens off this machine

**Status:** ready
**Blocked by:** the operator, for boxes 3–5 — an elevated PowerShell for the task registration if
`Register-ScheduledTask` refuses, a second machine with 7-Zip to extract on, and a decision on the
password length. Boxes 1–2 need nobody.
**Spec:** [`docs/disaster-recovery.md`](../../../docs/disaster-recovery.md) ·
[ADR 0024](../../../docs/adr/0024-no-dev-prod-split-migration-safety-is-local.md)

## Why

Promoted out of `ISSUE-01` §1 on 2026-08-21, which is where this work sat while it was still
deferred. It is not deferred any more: `TICKET-11` closed on 2026-08-20 with the encryption, the
private Drive folder and one uploaded archive, and everything that was holding the rest back went
with it. What remains is executable today.

The Free plan has **no automatic backups and no PITR**, so every backup this project has ever taken
is one a human remembered to take. The release-day dump undoes the release-day wipe and nothing
after it — from launch onward players write scores daily, and an incident three weeks in costs three
weeks. Two of the boxes below are about that; the other two are about whether the archive we do have
is actually a restore or just a file. A `.7z` that has only ever been opened on the machine that
wrote it, under a password read from `.env.local`, has not been tested — `npm run db:rehearse`
proves the archive restores **here**, which is the one place the archive is useless if the machine
dies.

The ordering rule that governed all of this is **spent**: it said never register the task before the
password is set, because a job throwing every Sunday at 02:00 unattended *looks like coverage*. The
password is set. Nothing is held back.

## Scope

- [ ] Run `npm run db:backup:schedule-weekly` and confirm
      `Get-ScheduledTask GreekWordGames-DB-Backup` returns the task with `State: Ready`. It writes an
      encrypted `.7z` into `db-backups/` on the keep-2 rule.
- [ ] Upload the archives that are already on disk but not in Drive — `db-backups/20260821-093358.7z`
      as of 2026-08-21 — and check what else the folder has accumulated. Nothing enforces this step
      and a schedule makes it *more* frequent, not less.
- [ ] Extract one archive **on a different machine**, with the password taken from the password
      manager rather than from `.env.local`. This is the box `TICKET-11` was closed without ticking,
      by operator ruling.
- [ ] Decide on the archive password. It is seven lowercase-and-digit characters, chosen 2026-08-20,
      and it is the one secret between a lost laptop and every player's email address — the archive
      now sits in cloud storage where it can be ground offline indefinitely. Lengthening costs one
      `db:backup` run, one re-upload, and one password-manager edit.
- [ ] Repoint the docs that currently send a reader to `ISSUE-01` §1 for this work:
      `docs/disaster-recovery.md` *See also*, `docs/launch-runbook.md` step 1,
      `.claude/aiHelper/reflections.md`, `.claude/aiHelper/goals.md`.

## Done when

The weekly task is registered and `State: Ready`; no archive sits in `db-backups/` that is not also
in the private Drive folder; one archive has been extracted on a second machine under the
password-manager password; and the password question has an answer recorded here (lengthened, or
accepted as-is with the reason).

What deliberately does **not** close this ticket: automating the Drive upload. That needs a Drive
credential on the machine, which is a decision nobody has made — it stays deferred, and if it is
still wanted after this ticket it becomes its own issue.

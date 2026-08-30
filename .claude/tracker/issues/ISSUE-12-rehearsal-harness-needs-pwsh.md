# `npm run db:rehearse` cannot run on this machine — the harness needs PowerShell 7

**Deferred:** 2026-08-30
**Revisit when:** the next migration is written, or sooner if a `db push` is ever wanted
from an agent session. Every migration from here on is gated on this, so it is deferred
only for as long as no migration is pending.

## Problem

CLAUDE.md makes `npm run db:rehearse` mandatory before every `npx supabase db push`, and
ADR 0024 makes that rehearsal the *entire* substitute for a staging database — it is the
only thing standing between a bad migration and the one Supabase project that backs both
dev and prod.

It does not run here. Measured 2026-08-30 while preparing
`20260830120000_restore_game_scores_data.sql`:

- `db:rehearse` shells out to `pwsh -NonInteractive -File scripts/rehearse-migration.ps1`.
  **`pwsh` is not installed** — the shell on this machine is Windows PowerShell
  **5.1.19041.6456**.
- Running the same script under 5.1 does not degrade gracefully, it **fails to parse**:
  `scripts/rehearse-migration.ps1:328` uses `$($Failed.Name), line $lineNo` inside an
  interpolated string, which 5.1's parser rejects (`Unexpected token 'line'`), and the
  cascade takes out the `try` at line 151 and the `if` at line 303 with it. So the failure
  reads as a broken script rather than a missing interpreter.
- Two of the script's own dependencies are also absent from PATH: **`psql`** and **`7z`**.
  Even with a working interpreter it would fail at the extraction step.

The consequence is not "an agent is inconvenienced". It is that the rehearsal gate is
**unenforceable in this environment**, and a session that follows CLAUDE.md to the letter
will discover that only at the moment it has a migration in hand — which is exactly when
the temptation to skip the gate is highest.

## Why it is deferred

Nothing is broken in production and no data is at risk today. The migration this was found
against is committed and unapplied; the operator can rehearse and push it from their own
shell, where the harness presumably works.

## What would fix it

Three options, cheapest first — none investigated, all guesses:

1. **Install PowerShell 7** on this machine and change nothing else. Likeliest correct
   answer if the operator's own shell is already pwsh.
2. **Make `db:rehearse` fail loudly and early** on a missing `pwsh`/`psql`/`7z` with a
   one-line message naming what is absent, instead of a parser cascade. Worth doing
   regardless of (1) — a gate that cannot run must say so in one line.
3. Make the script 5.1-parseable. Probably not worth it; it would be maintained against an
   interpreter nobody runs it under.

## Done when

`npm run db:rehearse` either completes against a real archive on this machine, or exits
non-zero within a second naming the missing dependency.

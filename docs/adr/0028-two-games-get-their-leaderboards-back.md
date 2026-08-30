# ADR 0028 — Λεξιαρχείο and Βρες τη Φράση get their scoring and leaderboards back

**Status:** accepted (2026-08-30)
**Reverses:** [ADR 0027](0027-two-games-lose-scoring-and-community-submission.md) §1–§3 — the
capability revocation, the deletion of both `scoring.ts` files, and the optional
`ShareResultPanel.score`. **§4 (the two community queues) is NOT reversed.**
**Restores:** [ADR 0025](0025-round-end-result-panel-and-share.md) (`score` is required again, on
every Game) · [ADR 0014](0014-leaderboards-are-higher-is-better.md) (Βρες τη Φράση is once more the
worked example of a points-not-attempts board)

## Context

ADR 0027 removed two things from these two Games on 2026-08-20, and it removed them together: the
leaderboard with its scoring, and Community Puzzle submission. The operator asked on 2026-08-30 for
the leaderboards back. The submission queues were not part of that ask.

That the two halves shipped in one pass does not make them one decision. Submission was removed
because **nobody had ever used it** — both queues measured 0 rows. The leaderboard was removed as a
scope call before launch, and a scope call is exactly the kind of decision that can be made again in
the other direction.

**The scores were never lost.** ADR 0027 §1–§3 stopped the writes; it did not delete a row. Measured
live on 2026-08-30, `game_scores` still holds **41 `leksiarxeio` rows across 15 devices** and **10
`vrestifrasi` rows across 5**, all frozen at `puzzle_date` 2026-08-20 — the day the removal
deployed. Restoring the capability therefore restores a board with real history on it, not an empty
one. (These are beta rows and `launch-reset.sql` still deletes them on release day; that is
unchanged and unrelated.)

## Decision

### 1. Both capabilities come back, on both Games

Both registry rows return to `capabilities: ["scores", "leaderboard"]`.

The same argument ADR 0027 §1 made in one direction holds in the other: `scores` and `leaderboard`
travel together, because a Score nothing ranks is a write worth nothing and a board with nothing
posted to it is worse. ADR 0020's construction does the work again — widening the capability set
widens `ScoreSubmissionGameId` and `LeaderboardGameId`, and the surfaces light back up.

### 2. The mechanism is `git revert`, and that is the point of §2

ADR 0027 §2 ruled that removal is deletion, not a flag, and that git history is the archive. Ten
days later that ruling is being tested by the case it was written against — someone wanted the thing
back. **It held.** The restoration is `git revert` of one commit (`0e8685b`), and it carried the
scoring, the hooks, the share lines and the tests with it.

This is worth recording because the alternative — a dormant `FEATURE_FLAGS` entry, kept "in case" —
would have cost ten days of dead code on every read of six files to buy an edit that turned out to
be one command. **A deleted feature is not an unrecoverable one, and the flag was not the cheaper
insurance.** Do not reach for a flag next time either.

### 3. Community Puzzle submission stays removed

Not restored, not partially restored. Nothing about the operator's ask touches it, both queues were
empty when they went, and both tables are dropped. Bringing back the buttons would mean a new
migration recreating two tables for a feature with zero measured demand.

The consequence is that the two halves of ADR 0027 have now diverged, and every doc that describes
them as one pass is wrong. They are rewritten, not annotated.

### 4. `game_scores.data` is re-added, and the old breakdowns do not come back

Λεξιαρχείο posts one result per word length and folds them into a single day row; the fold lives in
`mergeLengthScore` and reads and writes `game_scores.data`. That column was dropped on 2026-08-21 by
migration `20260820120000` **once ADR 0027 had made it dead**, so restoring the fold requires
restoring the column: migration `20260830120000_restore_game_scores_data.sql`, `jsonb not null
default '{}'`.

The default is what makes this safe against a table that is no longer empty — every one of the 686
existing rows, from all seven Games, is backfilled with an empty object.

**What is genuinely lost:** the per-length breakdown inside the 41 pre-removal Λεξιαρχείο rows. It
went with the DROP and no backup restore is being spent on it. Their `score` totals are intact,
nothing ever read the breakdown back, and `mergeLengthScore` folds forward from whatever it finds —
so an empty object means only that a player replaying one of those exact archive dates starts that
day's fold over. Fifteen devices, dates on or before 2026-08-20, and only on a replay.

This is the second DDL statement against a populated `game_scores`, which the old migrations freeze
existed to avoid. ADR 0027 §5 already spent that argument and deleted release-day step 5; nothing
here re-opens it. The guard is ADR 0024's, unchanged: `npm run db:backup` then `npm run db:rehearse`
before the push.

### 5. The Result Panel keeps the copy it grew while unscored

Two lines were rewritten *after* ADR 0027, for reasons that had nothing to do with scoring:
Λεξιαρχείο's «Βρήκες Χ λέξεις» (which counts Lengths **solved**, not Lengths reached) and Βρες τη
Φράση's verdict line, which deliberately **does not print the phrase on a loss** (operator,
2026-08-21). Both are kept.

What changes is only their rank in the panel. With no score above them they were the heading and
carried `text-2xl`; the πόντοι heading is back on top, so they return to being the subordinate
reveal line every other Game passes as `children`. Reverting their *content* would have thrown away
two decisions that were never about the leaderboard.

## Consequences

- **`ShareResultPanel.score` is required again**, and `composeShareText` always emits the `Σκορ: N`
  line. The no-score layout added by ADR 0027 has no callers and is gone; the other six Games are
  untouched in both directions.
- **`e2e/vrestifrasi.spec.ts` must now stub `POST /api/game-scores`.** It was the suite's only
  end-of-round spec precisely because this Game had nothing to post; that licence is withdrawn. It
  stubs the route and asserts the stub fired, the pattern `e2e/leksodromia.spec.ts` established —
  an interception that stops matching writes to production every run while still passing green.
- **The e2e rule "never finish a round in a test" no longer has an exemption.** Check the registry
  row before assuming a Game is safe to play out; as of this ADR none of the listed Games is.
- ADR 0014's amendment about Βρες τη Φράση losing its board is superseded by this one.

# Leksokipos writes `{ words, pangrams }` into game_scores.data and nothing ever reads it back

**Deferred:** 2026-08-15
**Revisit when:** whenever someone wants to answer it — this needs a decision, not a window.
**Not blocked by anything.** Split from ISSUE-05 on 2026-08-15 precisely because it involves **no
schema change**, so `TICKET-11`'s backup gate does not apply. The blocked `is_perfect` DROP stayed in
[`ISSUE-05`](ISSUE-05-dead-is-perfect-column.md).

## Problem

`game_scores.data jsonb DEFAULT '{}'` is **empty on 294 of 536 rows (55%)**, measured live
2026-08-15. The keys actually in use:

| Game | Keys written | Read back? |
| --- | --- | --- |
| `leksiarxeio` | `4`,`5`,`6`,`7`,`8` | **Yes — load-bearing** |
| `leksokipos` | `words`, `pangrams` | **No** |
| the other 5 games | *(none — stays `{}`)* | — |

**The Leksiarxeio keys must stay.** `mergeLengthScore` reads them back to fold each word length into
the day's row ([`src/app/api/game-scores/route.ts:96-115`](../../../src/app/api/game-scores/route.ts#L96-L115)).
The column is not droppable and this issue does not propose dropping it.

**The Leksokipos counts are write-only.** They are described at the payload type as *"for fairness
analysis"* ([`route.ts:42-44`](../../../src/app/api/game-scores/route.ts#L42-L44)), but nothing in
`src/` reads them back — and the same two facts are now recorded per-word in `player_milestones`
(`kind='pangram'` and `kind='word'`), which is what `/api/profile/stats` actually queries. So the
counts are either duplicated telemetry or an analysis nobody has run.

## The decision this needs

Two honest options, and the issue exists because picking silently is the bad outcome:

1. **Stop writing them.** Drop the `data` argument at the Leksokipos
   [`useScoreSubmission`](../../../src/hooks/useScoreSubmission.ts) call site. Roughly a one-line
   change plus a test. Existing rows keep their counts; nothing reads them, so nothing breaks.
2. **Keep writing them and say so.** If the fairness analysis is genuinely wanted later, the counts
   are cheap and the honest fix is a comment naming who reads them and when — not silence.

**Do not half-remove it.** Stopping the write while leaving the "for fairness analysis" comment in
place produces exactly the plausible-but-false signal this repo keeps paying for.

One input to the decision, since it argues against option 1 being obviously right: `player_milestones`
stores `word` rows only for words of **length ≥ 10** (the client-side floor added in s139 to cap the
write lane). So the `words` count in `data` is *not* redundant with the milestone lane — it is the
only record of a round's total word count. `pangrams` genuinely is redundant.

## Why deferred

No schema change and no urgency, but a real question about what the Platform wants to keep for
analysis — and the operator is the only one who can answer whether the fairness analysis is still
intended. It costs nothing to leave the writes in place until then, and the row cost is ~14 kB
across the whole table.

## References

- [`src/app/api/game-scores/route.ts`](../../../src/app/api/game-scores/route.ts) — the `data` payload contract and the only reader.
- [`src/lib/scoreMerge.ts`](../../../src/lib/scoreMerge.ts) — `mergeLengthScore`, why Leksiarxeio needs the column.
- [`src/hooks/useScoreSubmission.ts`](../../../src/hooks/useScoreSubmission.ts) — the Leksokipos call site that passes `data`.
- [`ISSUE-05`](ISSUE-05-dead-is-perfect-column.md) — the blocked DDL half of the original issue.
- ADR 0013 — `player_milestones`, and the ≥10 word-length floor that stops it being a full substitute.

# ADR 0019 — Two round spines: the guess family and the slot-fill family

- **Status:** Accepted
- **Date:** 2026-07-27
- **Supersedes:** none (extends the `useGuessRound` seam introduced in session 50)

## Context

The platform's daily games are not one shape. Two distinct families have emerged, and
each had its wiring copied between members rather than owned by one module.

**The guess family** (Leksiarxeio, Vres Tin Frasi) is Wordle-shaped: a fixed number of
attempts against a secret answer, a `status` of `playing | won | lost`, and a score that
is a pure function of `(attempts, won)` evaluated once the round ends. Its spine —
`src/hooks/useGuessRound.ts` — has existed since session 50.

**The slot-fill family** (Topothesies, Πόσο κάνει;, Λογοπαίγνιο) is Worldle-shaped: the
player fills a slot (a place, a price, a brand) from a prompt, guesses decay the score
toward a floor, giving up is an explicit end-state, and the score is posted continuously
while the round is live rather than once at the end. Each of the three was built by
cloning the last, so the same ~60-line spine existed three times: `useReducer`, a
`hasLiveActed` ref, a dispatch wrapper, an `onRestore` callback, a snapshot memo, and the
`useRoundPersistence` call. Eighteen rows, six distinct. A fix to the restore contract had
to be pasted three times, and the subtlest invariant in the family — that a restored round
must not report a live action — had no single place to be verified.

## Decision

**Two families, two spines.** `useSlotFillRound` (`src/hooks/useSlotFillRound.ts`) is a
sibling to `useGuessRound`, not a generalisation of it. Each game keeps only its reducer,
its initial-state factory, and two pure mappings between its state and its persisted
snapshot; the spine owns everything else.

The families are genuinely different and must not be merged:

| | guess family | slot-fill family |
|---|---|---|
| Members | Leksiarxeio, Vres Tin Frasi | Topothesies, Πόσο κάνει;, Λογοπαίγνιο, Λεξόπλεγμα |
| Spine | `useGuessRound` | `useSlotFillRound` |
| End-state | `status: playing \| won \| lost` | derived `solved` / `failed` / `gaveUp` |
| Give-up | not a concept | an explicit `GIVE_UP` action + persisted flag |
| Scoring | once, on end, from `(attempts, won)` | decay-to-floor, read live during the round |
| Score posting | on end | continuous, via `useLiveScorePost` |
| Live-vs-restore | not needed | `hasLiveActed()` — the defining requirement |
| Session key | the puzzle id | the puzzle date |

Membership is defined by the whole shape, not every row: Λεξόπλεγμα has no `GIVE_UP`
(finding all required words is its only end), yet it shares the derived end-state, the
continuous live posting, and the `hasLiveActed` requirement — so it belongs. A member may
lack give-up; it may not lack the live-vs-restore distinction.

The distinguishing requirement is the last two rows. Because slot-fill games post score
*during* the round, they need to know whether the player has actually acted this session —
otherwise merely opening a finished round from yesterday would re-post its score. The
guess family posts once at the end and has no such need, and its `status` union cannot
express "gave up" without changing what `won`/`lost` mean for the games already using it.

### The `hasLiveActed` contract

The spine issues `RESTORE_STATE` through the **raw** dispatch, while every action a Board
issues goes through the **wrapped** dispatch that flips the ref. That is the whole
mechanism, and it is why the distinction cannot leak into the games: a game that dispatched
its own restore would flip the flag and silently re-post scores.

`useLiveScorePost` reads this getter. The chain is: spine owns the flag → Board hands the
getter to `useLiveScorePost` → the policy hook declines to post for a restored, untouched
round. Verified once in `src/test/shared/useSlotFillRound.test.ts` against a synthetic
reducer, so it holds for every member and for any future one.

### Derived flags, replayed history

Both spines persist a *history*, never the flags computed from it. A refresh restores by
replaying the saved history through `RESTORE_STATE` and letting the reducer re-derive every
stage flag. This is what makes the snapshot small and makes a reducer change apply
retroactively to saved rounds instead of stranding them in a stale shape.

### Snapshot reference stability

`useRoundPersistence` writes on every new snapshot reference, so the spine memoizes the
projection on the projected **values** — reproducing the per-field dependency arrays the
three games used to hand-maintain. Memoizing on the whole state object instead would write
to localStorage on every dispatch, including keystrokes that change only an uncommitted
input. A regression test pins this.

## Consequences

- The restore/live contract is fixed in one place and tested once, against a synthetic
  reducer rather than any one game's rules.
- A fourth slot-fill game is an adapter (reducer + two mappings), not a paste.
- Two spines must be kept distinct on purpose. A future member joins the family whose
  end-state and posting model it actually shares — if a new game needs `gaveUp` *and* a
  `won/lost` status, that is a signal to re-examine the split, not to add a flag to both.
- `useLeksoplegmaRound` **is** a slot-fill member on the shared spine (migrated same day,
  under an integration safety-net test — `src/test/leksoplegma/round.test.tsx`). It carries
  the family's one genuine internal variation: its reducer's `RESTORE_STATE` **filters every
  restored word against the current puzzle**, so a stale saved word from another board is
  dropped rather than replayed — no other member does this. Its transient `wrongTrace` shake
  flag is deliberately kept out of the snapshot (it is UI state, reset on restore), and its
  `status` is re-derived by the reducer like the others' flags — persisted only for the
  write-guard's convenience, never trusted on restore. The initial-state factory takes the
  puzzle id first, so the adapter closes over `today` for the id and takes the spine's puzzle
  object as the parameter.
- `useLeksodromiaRound` is **not** a member and should not be migrated: it owns a decay
  clock, a reset-on-word-advance effect, and a restore that must interleave with
  `reset()` before the reducer replays. Its extra machinery is real, not copied.

## Alternatives considered

**One generic round spine for all five games.** Rejected: the union of both families'
options is a wide, mostly-optional interface, and every call site would pay for concepts it
does not have (`status` for the slot-fill games, `hasLiveActed` for the guess games). Two
narrow interfaces beat one wide one.

**Leave the duplication.** Rejected: three copies of an invariant that no test could pin is
exactly the case the deletion test identifies — remove the shared module and the complexity
reappears three times over.

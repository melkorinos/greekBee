# ADR 0014 — Every leaderboard is higher-is-better (no lower-is-better boards)

**Status**: Accepted

## Context

`game_scores.score` is a single shared column across all games, and the leaderboard GET (`/api/game-scores`) sorts by it. Most games are naturally higher-is-better (Leksokipos points, Leksiarxeio summed in-game points, Leksindeseis mistakes-remaining, Leksodromia/Leksoplegma points), but **Vres Tin Frasi** posted the raw **attempt count** (1–6 win, 7 loss) — lower-is-better — forcing a per-game `sort=asc` override threaded from the client to the API. That asymmetry meant any cross-game reader of `score` (leaderboards, and now the derived "first-place finish" placement work) had to know each game's direction to interpret rank, with no server-side source for that fact.

## Decision

**Every game that writes `game_scores` stores a higher-is-better score and the leaderboard always sorts descending.** No board is lower-is-better. Vres Tin Frasi is converted to post points via the already-existing `scoreVresTinFrasi` (`max(1, 7 - attempts)` for a win, 0 for a loss — the same scale as Leksiarxeio) instead of the raw attempt count. Existing rows are rewritten by data migration `20260715120100`. The `sort=asc` escape hatch in `buildLeaderboardUrl` / the API is retained for generality but has no live caller.

## Consequences

- A `score` value is comparable across games by a single rule (higher = better), so **placement / "first-place finish"** derivation (`MAX(score)` per `puzzle_date`) needs no per-game direction config — it was the alternative to this ADR (a `GAME_LEADERBOARD_CONFIG.sort` fact read by both client and a placement job) and is made unnecessary.
- Vres Tin Frasi's leaderboard label changes from "Προσπάθειες / χαμηλότερο = καλύτερο" to points / "υψηλότερο = καλύτερο". The in-game attempt count the player sees is unchanged; only the leaderboard currency changes.
- A one-time production data write (shared dev/prod DB) rewrites live Vres rows; without it, that game's board would rank inverted for the remainder of each row's 7-day window.
- CONTEXT.md's "Attempt Count (Vres Tin Frasi leaderboard)" term is retired in favour of a points concept mirroring Leksiarxeio "In-game Points"; the "Score is overloaded" ambiguity note loses its lower-is-better case.
- Adding a lower-is-better game later would require either an in-game transform to points (preferred, keeps this invariant) or reviving the `sort` override and re-introducing the per-game-direction problem this ADR closed.

## Amendment (2026-08-20, ADR 0027)

**The invariant survives; its worked example does not.** Βρες τη Φράση lost its `scores` and
`leaderboard` capabilities before launch, so `scoreVresTinFrasi` and the board this ADR converted are
both deleted. Λεξιαρχείο, the scale that conversion mirrored, went the same way.

Nothing about the rule changes: every Game that writes `game_scores` still stores a higher-is-better
score, the leaderboard still sorts descending, and the `sort=asc` escape hatch still has no live
caller. What is gone is the only Game that ever needed converting — read this ADR as the reason the
rule exists, not as a description of Βρες τη Φράση.

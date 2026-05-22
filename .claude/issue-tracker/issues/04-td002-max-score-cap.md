# TD-002 — Spelling Bee max-score cap is a blunt instrument

Status: needs-triage

`maxScore()` in `src/games/spelling-bee/lib/scoring.ts` hard-caps the ceiling at 500 pts (`MAX_SCORE_CAP`). This means puzzles with very large valid-word sets feel much easier than intended — a player can hit Queen Bee with far fewer words found proportionally.

## Current behaviour

```
maxScore = Math.min(Math.ceil(rawTotal * 0.8), 500)
```

## Proposed improvement

Replace the hard cap with a word-count percentile approach: the ceiling equals the score achievable by finding the top N% of words by frequency/length, so every puzzle scales to its own distribution regardless of raw dictionary coverage.

## Affected file

`src/games/spelling-bee/lib/scoring.ts` — `maxScore()`, `MAX_SCORE_CAP`

## Open questions

- What percentile makes puzzles feel right? Needs playtesting.
- Does this break existing leaderboard scores? Leaderboard stores raw points, not percentages — migrating would invalidate historical entries.

## Comments

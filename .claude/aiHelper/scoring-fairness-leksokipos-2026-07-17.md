# Leksokipos scoring fairness evaluation — 2026-07-17

**Verdict: keep the current tuning.** It is fair (every rank tier is genuinely occupied, top rank is earned at ~11% of player-days) and fun (day-to-day variety survives, no tier is dead or trivial). The residual day-to-day difficulty spread is driven by *word-familiarity composition* of each board — something the score curve cannot see — and every candidate re-tune that fixes one tail worsens the other (numbers below). Do not move `SOFT_CAP_KNEE`/`SOFT_CAP_K` on 20 days of ~10-player data.

Two real problems surfaced, both **outside** scoring tuning:

1. **28 of 1008 puzzles have zero pangrams** (e.g. 2026-06-20, 2027-02-15, 2028-12-23 — full list below). That breaks the genre invariant, the pangram achievement lane, and makes `PANGRAM_BONUS` moot on those days. This is a generator/data bug and deserves an issue.
2. **Scores can exceed the displayed max by up to 2×** on dense boards (9 of 197 live scores > 100% of max; 2026-07-10 top score 2095 vs max 1012). By design there's no hard ceiling, but it makes Απολυτότητα trivially cheap for engaged players on monster days (50% of the field hit it) while typical days sit at 0%. Verdict below: accept it — see "Rejected alternatives".

## Evidence — model (all 1008 puzzles)

Mirrors `scoring.ts` exactly (scale 0.85, knee 400, K 250, pangram +7).

| metric | min | p10 | med | p90 | max |
|---|---|---|---|---|---|
| valid words | 39 | 64 | 145 | 308 | 1070 |
| raw total | 118 | 326 | 815 | 1952 | 8361 |
| max (capped) | 101 | 278 | 594 | 850 | 1232 |
| max as % of raw | 14.7 | 43.5 | 72.9 | 85.2 | 85.6 |
| words to Απολυτότητα (best-first) | 14 | 31 | 58 | 73 | 84 |
| words to Απολυτότητα (random-order) | 27 | 44 | 84 | 109 | 128 |

- **The knee is live, not dead code:** 257/1008 puzzles (25.5%) have scaled ≤ 400 and pass through uncapped. The pass-through branch earns its keep.
- Best-first words-needed spans 14–84 over the full set — wider than the one-week 44–67 band, but the extremes are structural: the 14 belongs to 2027-02-15 (39 words, *zero pangrams*, max 101 — the smallest board shipped), the 84s to 300–450-word boards. Grouped by regime: below-knee boards need med 33 words but **~48% of their word pool**; monster boards (scaled > 800) need med 67 words but only ~29% of pool.
- No puzzle is absurd in the model's terms: nothing under 14 words or over ~50% of a huge pool best-first.

## Evidence — empirical (`game_scores`, 20 complete days 2026-06-27→07-16, 197 rows, 35 devices)

Reality partially **inverts** the model: dense boards are the *easiest* to rank up on (hundreds of findable inflections per rank point), small below-knee boards the hardest (the uncapped bar = 68% of raw, including the obscure tail).

- **Terminal rank distribution across all player-days is remarkably even** — Ψαράκι 18%, Έτσι κιέτσι 11%, Οκέι 9%, Για πάμε 12%, Θηρίο 10%, Φωτιά 16%, Γκουρού 13%, Απολυτότητα 11%. No dead tier, no free tier. The 0/8/16/24/35/45/60/80 ladder is well spaced against real play — **leave it alone**.
- Απολυτότητα reached on 21/197 player-days (10.7%) — reachable but earned. Per-day top-rank rate however swings 0% (12 of 20 days) → 38% (06-29) → 50% (07-10, the monster day).
- Best player's score as % of that day's max: min 38% (07-07, a 74-word below-knee board), med 80%, max 207% (07-10). On the three sub-knee days in the window, the top two tiers were empty twice.
- Median player lands between 12% and 60% of max depending on day (med of medians ≈ 40%).

**Caveats:** n ≈ 10 players/day from a ~35-device pool — single-day rates prove little. The 2095 on 07-10 cannot be distinguished from god-mode injection (the `data` jsonb stores no word list; `is_perfect` is 0 everywhere), so the 207% outlier is unverified. 2026-07-17 (day in progress, 4 rows) was excluded.

## scoreWord structure

- **4-letter = 1pt flat:** 15.9% of all words, 2.7% of all points. Economically negligible, which is the point — it stops dense boards from being ground out via 4-letter spam while still giving a dopamine tick. On dense boards the reward comes from inflection chains (one stem → many 5–8 letter forms), not fours. Keep.
- **Pangram +7:** 3.2% of all points across the set. On 1-pangram days (347 puzzles) it's a meaningful moment worth ~1–5% of max; on the 6 boards with 50+ pangrams (max 110, 2028-03-30) the bonuses are absorbed by the log cap anyway. The bonus is emotional, not economic, and its distortions are self-limiting. Keep 7.
- Pangram count distribution: 0 ×28 (**bug**), 1 ×347, 2–4 ×355, 5–9 ×157, 10–19 ×84, 20–49 ×31, 50+ ×6.

## Rejected alternatives (don't relitigate)

Fitness metric: spread of best-player %-of-max over the 20 live days (want tight around ~90–110), plus full-set words-needed re-run.

| tuning | best-player %-of-max min/med/max | stdev | words-needed med/max (model) |
|---|---|---|---|
| **current** knee=400 K=250 | 38 / 80 / 207 | 35 | 58 / 84 |
| alt-A knee=400 K=350 | 38 / 76 / 182 | 30 | 61 / 96 |
| alt-B knee=0 K=1000 (pure log) | 43 / 83 / 150 | 25 | 52 / 130 |
| alt-C knee=300 K=250 | 38 / 85 / 228 | 39 | 51 / 75 |

- **alt-A (raise K):** tames the monster-day overshoot slightly (207→182%) but raises max on the mid boards that were already unreachable (07-03 best drops 57→53%) and pushes the model's worst grind to 96 words. Fixes one tail by worsening the other.
- **alt-B (kill the knee, pure log):** best stdev, and the only curve that helps both tails (07-07 38→43%, 07-10 207→150%). Rejected because (a) it moves *every* day's max including the ~75% that empirically behave fine, (b) worst-case grind balloons to 130 best-first words, and (c) fitting a curve family to 20 days × 10 players is overfitting — the two hard days it fails to fix (07-03 at 54%, 07-07 at 43%) prove the spread is composition, not size. **This is the candidate to revisit if 90+ days of data confirm the pattern.**
- **alt-C (lower the knee):** strictly worse — compresses the small boards' max a little while inflating monster overshoot to 228%.
- **Hard cap / flatten %-of-raw:** already established as equivalent to deleting the cap's purpose; variety is a feature (see `memory.md`). Not re-examined.
- **Raise the 80% threshold or reprice 4-letter words:** the even tier occupancy says the ladder is right; 4-letter points are 2.7% of the economy — no lever there.

## Where fair and fun conflict

Monster days (dense, many pangrams) are objectively the easiest to go genius on, and grinders can sail past 100% of max. Strict fairness says compress them harder; fun says a rare day where everyone feasts and the bar gets blown through is a *feature* of a soft cap — it is exactly the "no hard ceiling" promise in the ADR. Picked fun: leave it, because the empirical cost is confined to ~1 day in 20 and the leaderboard still orders players correctly (raw score keeps discriminating past 100%).

## Follow-ups (not scoring-knob changes)

1. **File an issue: 28 zero-pangram puzzles** — regenerate or swap those boards. Dates: 2026-06-20, 06-30, 09-06, 09-13; 2027-02-15, 03-13, 03-28, 05-15, 06-29, 07-25, 09-22, 11-25, 12-20; 2028-01-04, 02-19, 03-15, 04-19, 04-29, 06-12, 06-17, 06-19, 06-20, 07-30, 09-08, 11-08, 11-25, 12-09, 12-23.
2. **Store found-word count with score posts** (e.g. in the `data` jsonb) so future fairness passes can separate legit grinders from god-mode and measure words-found directly against the model.
3. **Re-run this evaluation at ~90 days of live data.** If below-knee days keep showing empty top tiers and dense days keep minting cheap geniuses, adopt alt-B (`SOFT_CAP_KNEE: 0`, `SOFT_CAP_K: 1000`) — a one-line `gameRules.ts` edit; `softCap()` needs no code change (knee=0 degenerates cleanly).

## Not verified / thin

- Whether any over-max scores are god-mode (no word lists stored).
- Small-board hardness rests on 3 below-knee days in the live window.
- All empirical claims come from one ~35-device community over 20 days; rates, not truths.

*Method: analysis scripts mirrored `scoring.ts`/`ranking.ts` byte-for-byte semantics (scale→ceil→softCap→round); live data via read-only `execute_sql` on `game_scores` (`game_id='leksokipos'`, no custom-puzzle rows present).*

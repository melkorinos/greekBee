# Catalog rebuild + the launch reset — the release gate

Status: ready-for-agent

**Order:** third of three. **Blocked by [04](04-player-milestones-table.md)** — two badges read counters that
ticket creates.
**Spec:** [`.claude/handoffs/badgeIdeas.md`](../../handoffs/badgeIdeas.md) · ADR 0013 amendment 2026-08-06 §§3–6

## Why it is one ticket and not two

The catalog names achievement ids that live rows still hold — 34 devices hold `leksokipos-first-daily`, 2
hold `leksokipos-theristis`. ADR 0013's frozen-id exceptions are licensed **only** by the pre-launch wipe.
So the rebuild and the reset are one gate: **this ticket cannot merge without the reset script**, or there is
a window where the catalog and the data disagree.

## The catalog after the rebuild

Five badges. Every one tiered — no one-shot entries left, so the tier treatment is not decoration on some
badges, it is how every badge in the game reads.

| Badge | Earns on | Rungs | Source |
|---|---|---|---|
| Στην Κορυφή | lifetime days reaching top rank | 1 / 10 / 25 | `player_milestones` `kind='top_rank'` |
| Μακρυλέξης | a found word of exactly 10 / 11 / 12 / 13 letters | 4 (`diamanti`) | end-of-game detection, unchanged |
| Τζιμάνι | lifetime days finding **70%** of a puzzle's words | 1 / 5 / 10 | `player_milestones` `kind='tzimani'` |
| Κυνηγός Πανγκράμ | lifetime pangrams | 25 / 60 / 150 | `player_milestones` `kind='pangram'` |
| Συλλέκτης Πόντων | lifetime Leksokipos points | 1000 / 10000 / 25000 | `SUM` over `game_scores` (derived) |

**The rule every threshold was chosen under:** earned rows are immutable, so a threshold can be **lowered**
later (it grants retroactively) but never effectively **raised** (you cannot un-earn). Too high is
correctable; too low is permanent. **Err high.** The old pangram numbers put gold at ~11 days and one beta
device already held it — caught before launch.

## Scope

**Catalog + tuning**

- [ ] Remove **Πρώτα Βήματα**; `leksokipos-first-daily` is retired permanently and never reused. "You played
      once" is not an accomplishment worth a tile.
- [ ] Tier **Στην Κορυφή** and revive `leksokipos-tzimani` for the tiered 70% badge (tier ids
      `leksokipos-tzimani-chalkino` / `-asimenio` / `-chryso`). Both are frozen-id exceptions licensed by the
      reset below and by nothing else.
- [ ] `achievementTuning.ts`: `pangramTierThresholds` → 25/60/150, `theristisFoundRatio` → **0.7**, plus new
      `topRankTierThresholds` (1/10/25) and `tzimaniTierThresholds` (1/5/10). Rename
      `theristisFoundRatio` to match the badge's new name while you are there — it is a config key, not a
      frozen id.
- [ ] Wire both new tiered badges to the counters from ticket 04.

> **The ratio does not climb with the tier.** The ladder counts *days at 70%*. A 90/100% rung would be the
> retired perfect-round concept back under a new name.
>
> **0.7 is a guess and stays one** — the found-word ratio is not stored anywhere, so it cannot be estimated
> from the DB, and the operator declined capturing it. At 80% only 2 of 34 devices ever qualified once. If
> 70% proves as rare, the fix is lowering the ladder, which is free. **Στην Κορυφή's 10 and 25 are equally
> un-tuned** — repeat top-rank frequency was never captured; that gap is why `kind='top_rank'` exists.

**Profile page**

- [ ] A labelled Leksokipos **section** — not tabs — holding the Trophy Case and Λέξεις ανά μήκος, so it is
      unambiguous that badges are Leksokipos-only. Tabs when a second game earns.

**Docs**

- [ ] **ADR 0012 amendment** recording the one-time reset exception (see below) — required, not optional.
- [ ] **ADR 0013 amendment** recording where this supersedes the 2026-08-06 amendment: pangram thresholds,
      the Τζιμάνι ratio, the `player_milestones` shape (no `game_id`), and the launch reset scope.
- [ ] `CONTEXT.md` glossary: **`tzimani` now means "70% of a puzzle's words"**, not the retired perfect round.

**The reset script**

- [ ] `supabase/scripts/launch-reset.sql` — committed, version-controlled, reviewable, **never auto-applied**;
      the operator runs it in the dashboard on release day. Plus a launch-checklist line.

> A migration merged-but-unpushed was rejected as the gate: the next unrelated `db push` would fire it early,
> and CLAUDE.md treats un-pushed committed migrations as exactly the drift the workflow prevents.

## The reset — gameplay progress only, across all six games

| Reset | Kept |
|---|---|
| `game_scores` (all six games) | `player_profiles` rows — display names, device/account identity |
| `game_state` | `nominations` + `nomination_votes` — every past Leksikastirio decision |
| `player_achievements` | the four `community_*_puzzles` tables — submitted/approved content |
| `player_milestones` | `identity_audit`, `transfer_codes` |
| `player_profiles.selected_badge_id` → NULL (a column **update**, not a row delete) | |

Every leaderboard, streak, badge and stat starts empty; **nobody loses their name, and no word ever submitted
to or judged by Leksikastirio is touched.** The word list and community content are the expensive,
irreplaceable half of the beta — earned by real review work, not by playing. Only the *scoreboard* resets.

> ⚠️ **This breaks the append-forever rule.** CLAUDE.md and ADR 0012 both say `game_scores` is never pruned.
> This is a deliberate, operator-authorised, one-time exception and **must be recorded as an ADR 0012
> amendment**, not executed as a silent script. It erases leaderboards and streaks for all six games, not
> just Leksokipos — intended, not a side effect.
>
> It also settles a problem the reset would otherwise have: because points derive from `game_scores`, leaving
> scores intact would let Συλλέκτης Πόντων re-earn itself within a day for the devices holding bronze.

**Verified safe if the script is run partially:** `resolveDisplayBadge` returns `null` for an id it cannot
find in the catalog, so the two dangling `leksokipos-first-daily` selections render no badge rather than
crashing. The `selected_badge_id` NULL-ing is still required — this is a backstop, not a substitute.

## Done when

`npm run test -- --run`, `npx eslint .`, `npm run build` and `npm run test:e2e` all pass; the Trophy Case
shows five tiered badges; and `supabase/scripts/launch-reset.sql` is committed and reviewed. **The script is
not run by the agent** — the operator runs it on release day.

## Out of scope

**Badge art** is decoupled and must not block this — no id, no schema and no earned row depends on it. See
[`.claude/handoffs/badgeVisualSystem.md`](../../handoffs/badgeVisualSystem.md). Μακρυλέξης is treated there as
a progression even though its rungs are non-monotonic (a player can hold 13 without 10): a 13-letter find is
strictly harder than a 10, so the ladder reads true when a rung is skipped, and `resolveDisplayBadge` already
shows the rarest rung held.

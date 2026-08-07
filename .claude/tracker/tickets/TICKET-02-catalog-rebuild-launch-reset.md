# Catalog rebuild + the launch reset — the release gate

**Status:** ready
**Blocked by:** nothing in the repo — `player_milestones`, `POST /api/milestones` and the day-counter sync
lane shipped on 2026-08-07 (TICKET-01, file deleted per the standing rule; see ADR 0013's 2026-08-07
amendment). **Blocked operationally on `npx supabase db push` of `20260807120000` + the Vercel deploy**, which
the operator runs back to back, after hours. Until then the counters this ticket reads do not exist in the
database and nothing writes to them.

> ⚠️ **Read this before you conclude the tree is broken.** Until that push lands, `npm run test -- --run`
> reports **5 failures**, all in `src/test/shared/rlsInvariantsLiveDb.test.ts`, all
> `Could not find the table 'public.player_milestones' in the schema cache`. That is the un-pushed migration,
> not a regression and not yours. Everything else is green: 2341 of 2346 tests, eslint 0, build 0, e2e 7
> passed / 2 skipped. If any *other* test fails, that one is yours.

Two things TICKET-01 already changed **in the repo** that this ticket's Scope below still lists:
`theristisFoundRatio` is **already 0.7** in `achievementTuning.ts` (moved early because milestone rows are
only written as days are played, so a qualifying day passing under the old bar could never be recovered), and
`kind='tzimani'` rows now carry the achieved percentage in `value`. Neither is live yet — see below.
**Spec:** [`.claude/handoffs/badgeIdeas.md`](../../handoffs/badgeIdeas.md) · ADR 0013 amendment 2026-08-06 §§3–6

## Why it is one ticket and not two

The catalog names achievement ids that live rows still hold — 34 devices held `leksokipos-first-daily` and 2
held `leksokipos-theristis` when measured on 2026-08-06. **Both counts only grow**, and once TICKET-01's
commit is deployed `theristis` grows faster, since its threshold drops to 0.7. Re-measure rather than trusting
these figures. ADR 0013's frozen-id exceptions are licensed **only** by the pre-launch wipe.
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
- [ ] `achievementTuning.ts`: `pangramTierThresholds` → 25/60/150, plus new `topRankTierThresholds` (1/10/25)
      and `tzimaniTierThresholds` (1/5/10). Rename `theristisFoundRatio` to match the badge's new name — it is
      a config key, not a frozen id. **Its value is already 0.7** (TICKET-01); only the name is owed.
- [ ] Wire both new tiered badges to the counters from TICKET-01.

> **The ratio does not climb with the tier.** The ladder counts *days at 70%*. A 90/100% rung would be the
> retired perfect-round concept back under a new name.
>
> **0.7 is still a guess — treat it as un-tuned when picking this ladder.** At 80% only 2 of 34 devices ever
> qualified once. TICKET-01 made every `kind='tzimani'` row carry the achieved percentage in `value`, so the
> distribution **above** the threshold will accumulate once it is live (near-misses stay unrecorded,
> knowingly). **No such data exists yet:** nothing is written until `20260807120000` is pushed *and* the code
> deployed, and there will then be days of it, not weeks. If 70% proves as rare as 80% was, the fix is
> lowering the ladder, which is free. **Στην Κορυφή's 10 and 25 are equally un-tuned** — repeat top-rank
> frequency was never captured; that gap is why `kind='top_rank'` exists.

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

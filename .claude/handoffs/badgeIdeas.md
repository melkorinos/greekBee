# Handoff: Badge Catalog Rebuild — specified, not built

**Date:** 2026-08-06 (grilled twice, then reviewed for database architecture)
**Status:** Fully specified. Every open decision is closed. Tickets 03–05 are cut. No code is written.
**Goal:** hand a buildable, unambiguous spec to whoever picks this up next

---

## What changed in this revision

The previous version was an idea backlog with parked items and an under-specified owed-work list. It was
reviewed against the live database, re-grilled, and then **put through a database-architecture review on
2026-08-06** whose findings are folded in below.

What that review changed:

| Was | Now | Why |
|---|---|---|
| `game_id` column, outside the UNIQUE | **no `game_id` column** | the middle position silently undercounts once a second game earns; the future migration is documented instead |
| `POST /api/milestones` returns all four counts | returns **only the posted kinds'** counts | the words lane fires per found word and needs none of them |
| words lane posts every find, server floors at ≥10 | **client filters to ≥10 first**, server floor stays as backstop | turns ~30 requests per game into a few per week |
| six build items | **three tickets** | four of the six cannot merge independently — they are one seam |
| reset script under "`docs/` or `supabase/scripts/`" | `supabase/scripts/launch-reset.sql` | an open choice in a doc claiming every decision was closed |
| "no new trigger is needed" | one new sync lane's worth of work, budgeted | true about triggers, misleading about effort |

Three further findings were **raised and declined** by the operator (a `CHECK` on `kind`, the UNIQUE column
order, and capturing raw tuning signal) — recorded with their reasons in the Storage section so nobody
re-opens them as oversights. The migration/deploy ordering risk is closed by deploying after hours.

The parked-item list is gone — nothing is parked any more. What remains is a build spec and a launch
sequence.

Read `ADR 0013` and its 2026-08-06 amendment first. **This doc supersedes that amendment on four points**
(pangram thresholds, the Τζιμάνι ratio, the `player_milestones` shape, and the launch reset scope); an ADR
amendment recording them is **build item 0** below.

---

## Evidence: what the live DB actually says

Measured 2026-08-06 against production. This is what re-opened the thresholds.

| Signal | Measured |
|---|---|
| Devices with any earned badge | 34 (`leksokipos-first-daily`) |
| Devices that ever hit top rank | 14 of 34 (41%) |
| Devices that ever hit 80% of a puzzle's words | **2 of 34 (6%)**, in 44 days |
| Pangram capture | 292 rows, 21 devices |
| Top pangram player | 62 pangrams in 14 played days (~4.4/day; ~3/day is the engaged norm) |
| Pangram tiers already crossed | bronze 10 devices, silver 5, **gold 1** |
| `player_words` rows | 104 (≥10 letters only, after the two purge migrations) |
| Display-badge selections | 3 |

**The load-bearing principle these produced:** earned rows are immutable, so a threshold can be **lowered**
later (it grants retroactively) but never effectively **raised** (you cannot un-earn). Too high is a
correctable mistake; too low is permanent. **Err high.** Every threshold below was chosen under that rule.

---

## The catalog after the rebuild

Five badges. Every one tiered — there are no one-shot entries left.

| Badge | Earns on | Rungs | Source |
|---|---|---|---|
| Στην Κορυφή | lifetime days reaching top rank | **1 / 10 / 25** | `player_milestones` `kind='top_rank'` |
| Μακρυλέξης | a found word of exactly 10 / 11 / 12 / 13 letters | **4** (`diamanti`) | end-of-game detection, unchanged |
| Τζιμάνι | lifetime days finding **70%** of a puzzle's words | **1 / 5 / 10** | `player_milestones` `kind='tzimani'` |
| Κυνηγός Πανγκράμ | lifetime pangrams | **25 / 60 / 150** | `player_milestones` `kind='pangram'` |
| Συλλέκτης Πόντων | lifetime Leksokipos points | 1000 / 10000 / 25000 | `SUM` over `game_scores` (derived) |

**Πρώτα Βήματα is removed.** `leksokipos-tzimani` is revived for Τζιμάνι; tier ids
`leksokipos-tzimani-chalkino/-asimenio/-chryso`. Both licensed only by the launch reset.

### Threshold reasoning, and the one guess left

- **Pangram 25/60/150** replaces the 10/20/50 placeholders. At ~3 pangrams per played day that is roughly
  two weeks, five weeks, and three months. The old numbers put **gold at ~11 days** — one beta device
  already held it. This was the "too low is permanent" direction, caught before launch.
- **Στην Κορυφή 1/10/25** is unchanged and deliberately un-tuned: repeat top-rank frequency was **never
  captured** (that gap is why `kind='top_rank'` exists at all). Bronze at 1 preserves the shipped one-shot's
  meaning. 10 and 25 err high and get re-tuned from real data post-launch.
- **`theristisFoundRatio` drops 0.8 → 0.7.** At 80% only 2 of 34 devices ever qualified once, which made
  gold at 10 days unreachable — the same "unreachable as the audience grows" flaw that killed the podium
  badge. **0.7 is still a guess:** the found-word ratio is not stored anywhere, so it cannot be estimated
  from the DB. The ladder stays 1/5/10 precisely because that errs high; if 70% turns out to be as rare as
  80% was, the fix is lowering the ladder, which is free.
- **The ratio does not climb with the tier.** The ladder counts *days at 70%*. A 90/100% rung would be the
  retired perfect-round concept under a new name.

---

## Storage: `player_milestones`

One table replacing `player_pangrams` and `player_words`, plus the two new counters.

```
player_milestones(
  device_uuid  text    not null,
  puzzle_date  date    not null,
  kind         text    not null,          -- 'pangram' | 'word' | 'top_rank' | 'tzimani'
  detail       text    not null default '',
  value        smallint,                  -- nullable
  created_at   timestamptz default now()
)
unique (device_uuid, puzzle_date, kind, detail)
```

Insert-if-absent, append-forever, never swept, anon RLS = SELECT + INSERT only (the `20260716120100`
posture). Same as every table in ADR 0013.

Four shape decisions, each made for a stated reason:

- **`detail` is `NOT NULL DEFAULT ''`, not nullable.** Postgres treats NULLs as *distinct* in a unique
  index, so a nullable `detail` on the two detail-less kinds would let the same milestone insert twice and
  silently break insert-if-absent. `NULLS NOT DISTINCT` would also work, but supabase-js `upsert` needs an
  inferable conflict target — `''` is the simpler path.
- **`value smallint`, nullable.** This is the column the previous spec dropped by accident. The 2026-07-18
  amendment added `length` to `player_words` specifically so the words-by-length card **aggregates on an
  indexed column and never fetches rows** (soul.md Fluid-CPU). Word rows stamp `value` = word length
  server-side, exactly as `length` did today. Other kinds leave it null (absent ≠ zero). It also carries a
  future badge: "N words of 13+ letters" is `WHERE kind='word' AND value >= 13`, no row fetch.
- **No `game_id` column at all** — reversing the previous spec, which copied `player_words`' "column present,
  outside the UNIQUE" posture. That middle position is the one shape that can lose data silently: the day a
  second game writes a `word` or `pangram` milestone, its row for the same word and date collides with
  Leksokipos', and `ON CONFLICT DO NOTHING` swallows it — no error, just an undercount. Either end is safe;
  the operator chose to drop the column, because a column nothing reads is worse than no column and every
  earning surface is Leksokipos-only (build item 5 makes that visible in the UI).
  > 📌 **Known future migration — this is the documentation of it.** A second game earning badges needs
  > `ALTER TABLE player_milestones ADD COLUMN game_id text NOT NULL DEFAULT 'leksokipos'` **and** the UNIQUE
  > widened to `(device_uuid, game_id, puzzle_date, kind, detail)`. Both in the same migration — adding the
  > column without widening the key re-creates exactly the silent-undercount bug described above. Existing
  > rows all default correctly, so no backfill is needed.
- **`kind='tzimani'` keeps the name** even though ADR 0013 retired `tzimani_count` on 2026-07-18. The badge
  is called Τζιμάνι again, so a matching kind is the least surprising thing to read. **`CONTEXT.md` needs a
  glossary line** stating the term now means "70% of a puzzle's words", not the retired perfect round.

**Points stay out.** Lifetime points is a `SUM` over `game_scores` — derived, never stored. Materialising it
would create a second source of truth. **`player_achievements` stays separate**: it holds earned badges
(the output); `player_milestones` holds the inputs those crossings are computed from.

**`kind='word'` stays, and so does the Λέξεις ανά μήκος card.** The card is one read surface over the word
set, not the reason the rows exist: a future "N words of 13+ letters" tier is a *lifetime cumulative count*
and needs the append-only set regardless. The ≥10-letter floor holds the whole set to 104 rows across all
devices in 44 days, and the client-side filter below makes the write lane rare, so keeping it is close to
free. The card is already built and is the only thing giving those rows a visible purpose until that badge
ships.

> That future badge is a **new** tiered entry, not a re-shape of Μακρυλέξης. The four existing rungs are
> one-shots detected in-session from `foundWords`; a cumulative one reads a lifetime count off the server.
> The four frozen ids stay frozen.

### Deliberately not done (do not re-open without a new argument)

Raised in the 2026-08-06 architecture review and declined by the operator, with reasons:

- **`CHECK` constraint on `kind`.** Anon INSERT is open, so anyone holding the publishable key (it ships in
  the browser bundle) can write arbitrary kinds to an append-forever table. Declined: the impact is cosmetic
  junk, cleanup is a manual `DELETE`, and a constraint would make every future kind a migration. Revisit if
  junk actually appears.
- **`kind` second in the UNIQUE** (`(device_uuid, kind, puzzle_date, detail)`). Declined: every read is
  device-scoped and walks that device's rows anyway, so the reordering buys nothing measurable.
- **Recording the raw tunable signal** (a daily `found_ratio` / `rank` row regardless of threshold) so the
  0.7 guess could be re-tuned from a real distribution. Declined: the operator accepts staying blind on it.
  Consequence to accept knowingly — if 70% turns out as rare as 80% was, the ladder is lowered by judgement,
  not by data, exactly as it was this time.

---

## Detection and the API — this was the understated part

The previous spec called the absorption "a migration". **22 files reference the two tables.** The write
path, the read path, and the Restore merge all change together.

**Detection is already live and continuous** — the one-shot lane in
[useAchievementSync.ts:135](../../src/games/leksokipos/hooks/useAchievementSync.ts#L135) re-runs on every
`foundWords`/`rank` change, not at end-of-game. So `top_rank` and `tzimani` post the moment the condition
first holds, mirroring the pangram lane. No new *trigger* is needed, and both conditions are monotonic
within a session, so a live write is safe.

> **But "no new trigger" is not "no new work."** The one-shot lane posts achievement ids only. To feed the
> two new counters it needs a per-`(puzzle_date, kind)` ref (so a day's milestone posts once per session, the
> way `postedPangramWordsRef` works per word), a milestone POST, and tier detection off the returned count.
> Budget that as a fifth lane's worth of work, not zero.

- **One `POST /api/milestones` replaces `/api/pangrams` and `/api/words`.** One route, one sanitizer
  dispatching on `kind`, one sync lane instead of four. It **returns counts only for the kinds the caller
  posted**, so a lane that needs a crossing still gets it in one round-trip with no lag — preserving what ADR
  0013 B2 engineered for pangrams — while a lane that ignores counts pays for nothing. The previous spec
  returned all four counts on every call; see the write-lane cost section below.
- **`GET /api/profile/stats` replaces its standalone pangram `COUNT` with one `GROUP BY kind`.** Two badges
  gained live progress values and the hot route's query count stays flat — which matters, because the podium
  removal is deleting a query from that same route for load reasons.
- **`planPangramMerge` + `planWordsMerge` collapse into one `planMilestoneMerge`**, keyed on
  `(puzzle_date, kind, detail)`, wired into `restore()` in `/api/auth/link` beside the achievement merge.
  Union + UNIQUE dedup; double-count on merge stays impossible by construction. **The previous spec listed
  none of this.**
- **`GET /api/profile/words` and the `player_words_by_length` RPC** are rewritten against
  `player_milestones` where `kind='word'`, aggregating on `value`. The ≥10-letter write floor
  (`WORDS_MIN_TRACKED`, derived from `wordLengthBadges`) is unchanged and stays enforced server-side.
- Also touched: `database.types.ts` (regenerate — `npx supabase gen types`; it is not hand-edited),
  `src/games/leksokipos/sync.ts`, the cleanup-scores retention regression test, and
  `rlsInvariantsLiveDb.test.ts`.

### The write-lane cost — the one real scaling item in this plan

The words lane fires **per found word** and the server drops anything under 10 letters, so today almost every
request writes nothing and still pays for a `COUNT`. Piling a four-kind `GROUP BY` on top of that (the
previous spec's response shape) would multiply a cost that should not exist at all. Three fixes, all of them
in this build:

1. **Filter to ≥10 letters client-side, before posting.** `WORDS_MIN_TRACKED` already derives from
   `achievementTuning.wordLengthBadges` and is importable from the client. The lane then fires a handful of
   times a week per player instead of ~30 times per game. The server floor **stays** as the authoritative
   backstop — the client filter is an optimisation, never the rule.
2. **Return counts only for the kinds actually posted** (above). Pangrams keep their no-lag crossing; the
   words lane requests nothing and gets nothing.
3. **Skip the count query entirely when zero rows were inserted.** This is a live inefficiency in
   [words/route.ts:62](../../src/app/api/words/route.ts#L62) today, not something the rebuild introduces —
   fix it as the route is rewritten.

With the podium query deleted in ticket 03, these three are what keeps the profile and gameplay paths flat as
the audience grows.

### Accepted risk, recorded not fixed

`kind='top_rank'` and `kind='tzimani'` are **client-asserted day counts with no shape bound** — unlike words
and pangrams, whose text is regex-bounded. A scripted loop over 365 dates earns gold instantly; before the
rebuild the same forgery earned a single one-shot tile. This is the same client-trust model as scores and is
accepted, consistent with ADR 0013's "the server runs zero detection". A cheap partial bound, if it ever
matters: reject a `puzzle_date` more than a day or two from today in the route. Not built.

---

## Deploying this against the shared dev/prod database

**One Supabase project backs both dev and prod, so a `db push` is live in production immediately.** Between
that push and the Vercel deploy, production runs old code against the new schema. Dropping
`player_pangrams` / `player_words` in the same migration that creates `player_milestones` would therefore
500 every word find on prod for the length of that gap.

**The operator's decision: deploy after hours, when nobody is playing, and run `npx supabase db push` and the
Vercel deploy back to back** — not days apart. That closes the gap without splitting the migration.

> If the window ever has to be long, the alternative is to split into a create-only migration (ship code,
> deploy) and a separate drop migration afterwards. Do not do the drop early "because it's tidy."

---

## The launch reset — the sequencing this doc previously got wrong

The old version said "none of this is on the launch path" while ADR 0013 said the id exceptions "depend on
the wipe happening before release". Those contradict. **They ship as one gate.**

The catalog rebuild ticket carries the reset script as its final deliverable and **cannot merge without
it**. There is no window in which the catalog stops naming ids that live rows still hold — 34 devices
currently hold `leksokipos-first-daily` and 2 hold `leksokipos-theristis`.

**Scope: gameplay progress only, across all six games — identity and community content survive.**

| Reset | Kept |
|---|---|
| `game_scores` (all six games) | `player_profiles` rows — display names, device/account identity |
| `game_state` | `nominations` + `nomination_votes` — every past Leksikastirio decision |
| `player_achievements` | the four `community_*_puzzles` tables — submitted/approved content |
| `player_milestones` | `identity_audit`, `transfer_codes` |
| `player_profiles.selected_badge_id` → NULL (a column update, **not** a row delete) | |

Every leaderboard, streak, badge and stat starts empty; **nobody loses their name, and no word ever
submitted to or judged by Leksikastirio is touched.** The game is still friends-and-family; the operator's
reason is going live with confidence rather than with 44 days of test data.

The word list and community content are the expensive, irreplaceable half of the beta — they were earned by
real review work, not by playing. Only the *scoreboard* resets.

> ⚠️ **This breaks the append-forever rule.** CLAUDE.md and ADR 0012 both say `game_scores` is never pruned,
> and this is a deliberate, operator-authorised, one-time exception. It **must be recorded as an amendment
> to ADR 0012**, not executed as a silent script. It also erases leaderboards and streaks for all six games,
> not just Leksokipos — that is intended, not a side effect.
>
> This also settles a problem the reset would otherwise have: because points derive from `game_scores`,
> leaving scores intact would have let Συλλέκτης Πόντων re-earn itself within a day for the 18 devices
> holding bronze. Resetting scores removes that inconsistency.

**Mechanism: a committed runbook `.sql` at `supabase/scripts/launch-reset.sql`** — **not**
`supabase/migrations/` — plus a launch-checklist line. Version-controlled and reviewable, never auto-applied;
the operator runs it in the dashboard on release day. (The previous spec left the location as "`docs/` or
`supabase/scripts/`"; `supabase/scripts/` wins because it sits beside `migrations/` where a reader looking
for schema operations will actually look.)

> A migration merged-but-unpushed was rejected as the gate: the next unrelated `db push` would fire it
> early, and CLAUDE.md treats un-pushed committed migrations as exactly the drift the workflow prevents.

---

## Build work — two tickets left, in order

The previous spec listed six items. Four of them cannot merge independently: dropping the old tables,
retiring their routes, rewriting the merge, and rewriting the reads are one seam, and shipping any of them
alone leaves the app broken. They are one vertical slice. The remaining tickets live at
`.claude/tracker/tickets/`:

**~~Remove the podium lane~~ — shipped 2026-08-06** (commit `32a866b`). Pure deletion. Retired a known
scaling risk: the podium query fetched every device's Leksokipos rows. Its ticket file is deleted, per the
standing rule.

**[TICKET-01 — `player_milestones`](../tracker/tickets/TICKET-01-player-milestones-table.md).** Migration,
`POST /api/milestones`, `planMilestoneMerge`, the `GROUP BY kind` on `/api/profile/stats`, the rewritten
words-by-length read, the sync lanes, and the three write-lane cost fixes.

**[TICKET-02 — Catalog rebuild + launch reset](../tracker/tickets/TICKET-02-catalog-rebuild-launch-reset.md).**
The five-badge catalog, `achievementTuning` edits, the profile-page Leksokipos section, and the reset script
that gates release.

**ADR amendments ride inside the tickets that make them true** — ADR 0013 §1 and the `CONTEXT.md` Podium
glossary removals went with the podium deletion; the ADR 0012 reset exception and the `tzimani` glossary line
are in TICKET-02.
Writing them as a separate item-0 was the previous spec's mistake: an amendment merged before the code it
describes is a claim about a state the repo is not yet in.

---

## Badge art

Unchanged and still decoupled — see `.claude/handoffs/badgeVisualSystem.md`. **No id, no schema, and no
earned row depends on badge art**, so it can land in any order and must not block anything here.

One decision was added to it by this grill: **Μακρυλέξης is treated as a progression** even though its rungs
are non-monotonic (a player can hold the 13-letter rung without the 10). A 13-letter find is strictly harder
than a 10, so the ladder reads true when a rung is skipped, and `resolveDisplayBadge` already shows the
rarest rung held. The art needs four steps; nothing in code changes.

---

## Closed, so nobody re-opens them

- **Podium / placement badges — rejected.** Podium slots are fixed at three while the audience grows, so any
  "finished top-N" badge gets strictly harder over time. That is a metric problem; no threshold fixes it. A
  percentile metric is audience-proof but at 8 players a day the top 10% is one player — harsher than first
  place. Do not re-promote this without a new argument about the **metric**, not the thresholds.
- **Multiple displayed badges + precedence — closed.** One badge, permanently. Decided, not deferred.
- **New Τζιμάνι conditions — resolved.** It is the tiered 70% badge above.
- **Words-by-length badges — resolved.** They are Μακρυλέξης, already shipped as a presentation ladder over
  four frozen one-shot ids.
- **Cumulative-stat badges ("reached rank N this many times") — resolved by construction.** Στην Κορυφή *is*
  that badge. Any further one is a new `kind` value in `player_milestones`, not a new table.
- **Badge earning outside Leksokipos — still parked**, and item 5 above makes that scoping visible in the UI.

---

## Suggested skills

- `/tdd` — build each of the three tickets red-green-refactor. Tickets are already written; do not re-cut them.

## Related

- **ADR 0013** — `player_achievements`, the three detection lanes, the frozen-id rule, and the 2026-08-06
  amendment this doc supersedes on four points
- **ADR 0012** — append-forever identity/score stance; needs the one-time reset exception recorded
- `.claude/handoffs/badgeVisualSystem.md` — the SVG mark work, decoupled
- `.claude/aiHelper/log.md` sessions 66, 69, 107–113 — the achievements build history

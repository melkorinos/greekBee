# ADR 0027 — Λεξιαρχείο and Βρες τη Φράση lose scoring and Community Submission before launch

**Status:** accepted (2026-08-20)
**Extends:** [ADR 0020](0020-registry-capabilities-presentation-derives-behaviour-enrols.md) — the
capability set is what a Game does to the shared database; this ADR revokes both capabilities from
two Games and records what that reaches.
**Amends:** [ADR 0025](0025-round-end-result-panel-and-share.md) (`ShareResultPanel.score` becomes
optional) · [ADR 0013](0013-achievements-immutable-earned-fact-rows.md) (`is_perfect` is dropped,
not kept) · [ADR 0014](0014-leaderboards-are-higher-is-better.md) (Βρες τη Φράση no longer has a
board for its points to be the currency of)

## Context

The operator's pre-launch pass on 2026-08-20 removed two player-facing surfaces from **Λεξιαρχείο**
(`leksiarxeio`) and **Βρες τη Φράση** (`vrestifrasi`):

- the **leaderboard** — the 🏆 button on the picker card and in the Game header, the modal, and the
  leaderboard link inside the Round-End Result Panel;
- **Community Puzzle submission** — the ➕ button, the submit modal, the `/api/community-puzzles/*`
  routes for both Games, and the two Leksikastirio review tabs.

Both community tables were measured empty on the day: `community_leksiarxeio_puzzles` **0 rows**,
`community_vrestifrasi_puzzles` **0 rows**. The feature shipped, was announced to nobody, and was
never used. `game_scores` held 40 `leksiarxeio` rows across 14 devices and 10 `vrestifrasi` rows
across 5 — beta data that `launch-reset.sql` deletes on release day regardless.

## Decision

### 1. Both capabilities are revoked, not just `leaderboard`

Both registry rows become `capabilities: []`.

Keeping `scores` while removing `leaderboard` would leave a clerk writing every result into a ledger
nobody reads — the precise "needless information" the pass exists to remove. ADR 0020's opt-in
construction does the rest: `ScoreSubmissionGameId` and `LeaderboardGameId` narrow automatically, so
every surface that consumed them stops compiling until it is deleted.

### 2. Removal is deletion, not a flag

No dormant code, no `FEATURE_FLAGS` entry. This follows the ruling ADR 0022 already made for the
«Υπό κατασκευή» chip: a surface taken out of the product is deleted, and git history is the archive.
The alternative — Offline Mode's parked-but-wired posture (ADR 0010) — is reserved for features
waiting on a decision. This one has had its decision.

### 3. Scoring is removed *whole*, including the local number

The score for these two Games is not merely unpublished — it stops being computed. `scoring.ts` goes
for both Games, `scoreFn` leaves `useGuessRound` (which no other Game uses), and the `Σκορ: N` line
leaves both share texts.

This is the part with a cost outside the two Games, and it is taken deliberately:
**`ShareResultPanel.score` becomes optional** and the panel grows a no-score layout. Eight boards
render that component and the other six are unchanged, but the contract is one day old at the time
of this decision. Half-measures were rejected: leaving `scoring.ts` alive to feed a number that
appears nowhere is the dead-code trap this repo has paid for before, and a Game that shows `πόντοι`
with nothing to compare them against is worse than one that shows none.

Λεξιαρχείο's Round End (ADR 0025 — all five Lengths *resolved*) is unaffected: it is defined on
round status, never on score.

### 4. Both community tables are dropped

Not emptied, not left in place. An empty table that a cold reader finds in the schema reads as a
live feature — the same plausible-but-false signal ISSUE-05 records for `is_perfect`. Zero rows
means zero data loss, so there is nothing to weigh against clarity.

**Consequence:** `launch-reset.sql`'s KEPT list, which names all four `community_*_puzzles` tables
and calls community puzzles "the expensive, irreplaceable half of the beta", becomes false for two
of them. It is rewritten, not annotated.

### 5. The migrations folder unfreezes, and everything owed to `game_scores` lands at once

`supabase/migrations/` was frozen until release-day step 5 because a committed-but-unpushed
migration fires on the next unrelated `db push`. That freeze bought one thing: DDL against
`game_scores` at the single moment the table is empty.

**Dropping `game_scores.data` early spends that argument**, and `data` must go — Λεξιαρχείο's
per-length fold was its only writer and nothing else ever read it back. Once DDL runs against a
populated `game_scores` at all, running it twice buys nothing. So one migration carries everything
owed to the schema:

```sql
drop table if exists public.community_leksiarxeio_puzzles;
drop table if exists public.community_vrestifrasi_puzzles;
alter table public.game_scores drop column if exists data;        -- this ADR
alter table public.game_scores drop column if exists is_perfect;  -- ISSUE-05
create index if not exists nominations_word_direction_status_idx  -- ISSUE-01 §3
  on public.nominations (word, direction, status);
update public.nominations set word = 'ιουνιοσ'                    -- ISSUE-01 §3
 where word = 'ιουνιος' and direction = 'remove';
```

The last two statements were only sitting on release day because the folder was frozen; ISSUE-01 §3
says so in as many words. Neither depends on the wipe — `nominations` survives step 4 — so they come
along and **release-day step 5 disappears entirely**, taking release day from six steps to five.

The risk the freeze was managing is answered by ADR 0024's mechanism rather than by timing:
`npm run db:backup` then `npm run db:rehearse` before the push, which replays the queue against a
real archive. That is the same guarantee step 5 would have had, minus the empty table.

**Ordering constraint that survives:** the migration must not run before the code removing both
surfaces is live in production, or a submit POST from the deployed old bundle hits a missing table.
Deploy first, migrate second.

## Consequences

- Λεξιαρχείο and Βρες τη Φράση stay **fully live and listed** — this removes two surfaces, not two
  Games. Neither `wip` nor `hidden` changes (ADR 0022).
- Five Games keep a board: Λεξόκηπος, Λεξοδρομία, Λεξόπλεγμα, Τοποθεσίες, and Λεξινδέσεις (hidden,
  and deliberately untouched — its route stays live and its submission stays wired).
- `ScheduledPuzzleTable` narrows to `community_leksindeseis_puzzles` alone. The scheduling half of
  `communityPuzzleLifecycle` stays — it has one consumer, which is enough, and Λεξινδέσεις may yet
  graduate.
- `useGuessRound` loses `scoreFn` outright rather than making it optional: both its callers are the
  two Games in this ADR, so reinstating it would be a type error rather than a silent revival.
- The 50 beta score rows are left alone. `launch-reset.sql` deletes them at release-day step 4, and
  the append-forever rule (ADR 0012) has exactly one licensed exception — that script. This ADR does
  not add a second.
- **ADR 0013's line stating `is_perfect` is *kept* stops being true** the moment the migration lands
  and must be amended in the same branch. ISSUE-05 flagged this as easy to forget; it is repeated
  here because the drop moved off the day ISSUE-05 scheduled it for.

## Rejected

- **Hide behind a feature flag.** Reversible, and leaves the whole machine wired and inert for a
  decision already taken. §2.
- **Revoke `leaderboard`, keep `scores`.** Rows accrue, nothing ranks them, profile lifetime totals
  quietly keep counting them. §1.
- **Keep the local `πόντοι` number.** Avoids touching `ShareResultPanel`, at the price of a score
  with no destination and a `scoring.ts` kept alive to feed it. §3.
- **Keep the empty tables.** §4.
- **Leave `is_perfect` on release day and drop `data` now.** Two migrations, two rehearsals, one
  risk window's worth of benefit. §5.
- **Remove Λεξινδέσεις's submission too.** It is `hidden`, so it advertises nothing; touching it
  costs work for zero launch surface and would leave `ScheduledPuzzleTable` empty.

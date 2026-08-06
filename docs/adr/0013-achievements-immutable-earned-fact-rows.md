# ADR 0013 — Achievements: immutable earned-fact rows, client-detected

**Status**: Accepted — refines the achievements storage sketch in ADR 0012 (confirms immutable rows over the Epic-A handoff's JSON-blob proposal) and inherits ADR 0012's `device_uuid` identity anchor.

## Context

Achievements Epic A ships the first 5 one-shot Leksokipos badges: they earn at end-of-game and light up in the Trophy Case (silent — no toast). The display catalog already ships as pure data (`src/games/leksokipos/lib/achievements.ts`) and `TrophyCase` already renders every tile locked. This ADR fixes the load-bearing calls before build: **storage shape, detection, merge-on-Restore, retention.**

Two proposals were in tension:

- **ADR 0012 Consequences** stated achievements are *"stored as immutable idempotent rows (`(device_uuid, achievement_id)` unique, `earned_at` never revoked)… awards are facts, not counters."*
- The **Epic-A handoff** sketched a single `player_stats(device_uuid, data jsonb)` blob per player (`data = { earned: [] }`), merged by a union-on-write function.

They contradict. The product constraint that breaks the tie is ADR 0012's: **"achievements are worthless if losable"** — so structural resistance to progress loss dominates. The blob's write is a whole-set *replace* (clobber risk under two-tabs / stale-device / fresh-device-with-empty-local); the rows model has no replace operation at all.

## Decision

1. **Storage — immutable rows.** `player_achievements(device_uuid text, achievement_id text, earned_at timestamptz default now())`, `UNIQUE(device_uuid, achievement_id)`. One row = one earned fact. Never updated, never revoked.
2. **Detection — client-side, at end-of-game**, in pure logic in `src/games/leksokipos/lib/achievements.ts` (add predicates for the 5 one-shots; zero React imports; testable). Same trust model as client-posted scores (client-detected, server-recorded, idempotent). **The server runs zero detection.**
3. **Earning — insert-if-absent.** `INSERT … ON CONFLICT (device_uuid, achievement_id) DO NOTHING`. There is **no operation that replaces or removes a set**, so "earned forever" holds *by construction*, not by a merge function. Clobber is impossible.
4. **Write RLS — open**, mirroring `game_state`'s `anon access` (`USING (true) WITH CHECK (true)`). *Amended 2026-07-16 (migration `20260716120100`): "open" now means SELECT + INSERT only — the DB itself enforces append-only against anon; UPDATE/DELETE run solely through the service-role client (`/api/auth/link` merge, retention cron), and `game_state` additionally keeps anon UPDATE for its upsert. Row expressions stay `true`; open INSERT stays the recorded accepted risk.* End-of-game writes are anonymous and must also succeed for signed-in players. Deliberately **not** stored on `player_profiles`: its `UPDATE` policy is owner-scoped (`auth_user_id IS NULL OR auth_user_id = auth.uid()`) so an anonymous end-of-game write to a signed-in player's row would be rejected, and its `NOT NULL display_name` makes upsert-if-absent awkward.
5. **Sign-in Restore merge.** In `restore()` (`/api/auth/link`), **before** deleting the old device's profile row, re-point its achievements onto the canonical identity: `UPDATE player_achievements SET device_uuid = <canonical> WHERE device_uuid = <old>`, de-duplicated via the unique constraint (delete-then-repoint, or `ON CONFLICT DO NOTHING`). Mirrors `planScoreMerge`. This closes the one real progress-loss hole. The merge stays silent (union, nothing discarded — ADR 0012 §4).
6. **Retention — never swept.** `player_achievements` is lifetime / append-forever. `/api/cleanup-scores` sweeps `game_state` only and must never touch it. Same append-forever stance as `game_scores` and `identity_audit`.
7. **Display.** `/profile` fetches the earned `achievement_id`s for the device and lights the matching `TrophyCase` tiles; unearned stay locked. The 2 tiered badges (`kynigos-pangram`, `syllektis-ponton`) stay locked in Epic A.
8. **Recovery.** A botched merge or a link-time mapping overwrite is reconstructable via `identity_audit` (device→account history) — same break-glass path as score recovery (`docs/admin-restore.md`).

## Considered Options

- **Single JSON blob per player** `{ earned: [] }` (handoff sketch). Rejected for Epic A: every write replaces the whole set (clobber risk), needs a custom union-on-write function plus fetch-hydrate-before-push discipline, and contradicts ADR 0012. Its only edge — Epic B stat-sets sharing one row — is deferred, and counters are aggregates, not immutable facts.
- **Column on `player_profiles`.** Rejected: owner-scoped `UPDATE` RLS blocks anonymous end-of-game writes for signed-in players; `NOT NULL display_name` complicates upsert-if-absent; couples the identity table to a per-game hotpath.
- **Server-side detection.** Rejected: per-game server CPU (soul.md Fluid-CPU) with no security upside — same trust model as scores.

## Consequences

- **Adding a badge later** = a new frozen `achievement_id` string + a client predicate. No migration, no server change. Renaming/removing an id orphans earned rows (same freeze rule as Puzzle IDs, ADR 0012). **First deliberate exception 2026-07-18 — see the amendment below.**
- The handoff's `player_stats(data jsonb)` table and its union-merge function are **dropped** in favour of `player_achievements` rows; the "add-don't-replace" concern dissolves (insert-if-absent cannot clobber).
- **Epic B** (tiered badges) needs progress counters (distinct-pangram sets, lifetime points). Those are **not** earned-fact rows and are out of scope here; Epic B chooses their store (a stats blob/column is reasonable there, where the write path can be designed for merge). `player_achievements` still holds the earned *tier* facts (`…-chalkino/-asimenio/-chryso` ids).
- **Three data classes, kept separate** (do not build a stats table that duplicates class 2): **(1) earned Achievement facts** — one-shot *and* tiered (a tier is its own frozen `achievement_id`) — live as `player_achievements` rows (this ADR); **(2) Lifetime Stats** (total points, puzzles played, Streak) are **derived from append-forever `game_scores`**, never stored (CONTEXT.md glossary); **(3) Epic B progress counters** that cannot be cheaply derived (e.g. lifetime distinct-pangram set) get their own store, designed in Epic B. "Badge" / "Trophy Case" are the visual token / surface of (1), never a separate store.
- ~~The 🏛️ **Τζιμάνι leaderboard glyph stays independently derived** from `game_scores.is_perfect`.~~ **Retired 2026-07-18** — the perfect-round / Τζιμάνι concept was removed from every surface (achievement, stat cell, glyph, score wire). See the amendment below.
- **Extensible by design — the store is agnostic to writer and source.** `player_achievements` is keyed only by `(device_uuid, achievement_id)`, so it supports platform-wide and cross-feature awards (not just per-game), written from any hook. Detection has three lanes: **(A) client, live, at an event** (end-of-game, nomination-submit, …) — covers most; **(B) deferred server-side at puzzle-close** for **relative / time-dependent** signals whose value isn't final at end-of-game (e.g. 1st/2nd/3rd place) — a once-per-day job writes the same fact rows, and must award before the source score row is pruned; **(C) append-only set → size → crossing fact** for cumulative counts (Epic B tiers). Verified 2026-07-05 against hypotheticals (placement, 0-wrong-guesses, report-a-word) — all expressible. **Derivation is intentionally not a lane** (see next bullet).
- **Dependency flag — not Epic A's to fix, but blocks Epic B/stats.** `game_scores` is pruned at `SCORE_RETENTION_DAYS` (10) by `/api/cleanup-scores`, which **contradicts ADR 0012's "append-forever" intent** and makes `/api/profile/stats` a 10-day rolling total rather than a lifetime one. Achievement *facts* are immune (own table, never swept) — a core reason awards are stored, not derived. But anything deriving from `game_scores` lifetime history (Lifetime Stats today; Epic B's `syllektis-ponton` point tiers) is capped at the window. Resolve the append-forever contradiction before shipping point-based tiers or lifetime stats.
- **No backfill:** the DB hard-resets at launch; every device starts with zero achievement rows (TrophyCase already shows the beta-reset notice).

## B1 resolutions (2026-07-06) — the points tier + unlock toast

The first Epic-B slice settled the four open detection/UX questions on the *safe* badge (Συλλέκτης Πόντων — no migration, no merge change):

- **Points source = Leksokipos-only** (not cross-game). `aggregateLifetimeStats` gained a `leksokipos_points` field (sum of `game_scores.score` where `game_id = 'leksokipos'`), served by the existing `/api/profile/stats` with **zero new query**. A Leksokipos badge earns from Leksokipos points only — same scoping as `tzimani_count`. Confirms **data-class 2**: the tier is a **crossing fact derived from append-forever `game_scores`** — no new counter store (the dependency flag above was cleared in session 65).
- **Detection = lane C via an async read-back, on game-screen mount.** `detectEarnedPointsTiers(points)` is pure; `useAchievementSync` reads `leksokipos_points` back once per mount and posts freshly-crossed tier ids (idempotent via insert-if-absent). **One-game lag accepted** — the just-finished score may not be in the total yet, so a tier crossed this game is caught on the next mount. Belt-and-suspenders like the Τζιμάνι glyph.
- **Unlock toast (live, in-game).** `useAchievementSync` fetches the **earned-at-mount** set and surfaces only *genuinely-new* badges (one-shot or tier) to an in-game `AchievementToast`, so a badge earned in a prior session never re-toasts. Detections landing before that set loads are held pending and flushed once it arrives (race-safe).
- **TrophyCase progress.** Per-tier chips light on `earned.has(tierId) || points >= threshold` (self-consistent with the "X / N" number shown, sourced from the same `/api/profile/stats.leksokipos_points`). The pangram tier has no live source in B1 and stays earned-fact-only.

## B2 resolutions (2026-07-07) — the pangram tier (data-class 3: an append-only set)

The second Epic-B slice ships Κυνηγός Πανγκράμ. Unlike the points tier (a crossing *derived* from `game_scores`), pangram progress is the one signal that **cannot be cheaply derived** — so it is the ADR's **data-class 3**: a new append-only set whose *size* is the progress, never a stored counter.

- **New table `player_pangrams`** (`migration 20260706120000`) — `(id, device_uuid text, puzzle_date date, word text, found_at)`, `UNIQUE(device_uuid, puzzle_date, word)`, open RLS (per the §4 amendment: anon SELECT+INSERT only since `20260716120100`), mirrors `player_achievements`. **Progress = `COUNT(*)`, never a `count = count + 1` column** — a mutable counter re-introduces the exact clobber/double-count trap immutable facts avoid (a retry posts twice; a merge double-counts). The set is retry- and merge-safe by construction.
- **UNIQUE key = `(device_uuid, puzzle_date, word)`, count = `COUNT(*)`** (not `COUNT(DISTINCT word)`). The same word on two different days counts twice; within one puzzle it dedups (retry-safe). Terminology isn't frozen, so we store the *richest* fact (keep the day dimension) and let the count query define "distinct" — a later pivot to distinct-words is a query change, **no migration**.
- **Own route `POST /api/pangrams`** — insert-if-absent (`ignoreDuplicates`), returns the device's fresh lifetime `{ count }` so the client checks the crossing in one round-trip (server runs zero detection). No id whitelist is possible for arbitrary words on an open-RLS append-forever table, so junk is bounded by **shape** instead (`sanitizePangramWords`: `normalizeLetters` before the UNIQUE text key, a `^[α-ω]{7,24}$` pangram-shape filter, de-dupe, 50/request cap) + an `isISODate` guard on `puzzle_date`.
- **Detection = immediate crossing + mount self-heal (no lag).** A 3rd lane in `useAchievementSync` delta-posts newly-found pangrams (per-word ref) and reads the crossing off the returned count — `detectEarnedPangramTiers(count)`, immediate because the POST just inserted them. A mount lane also reads `pangram_count` back (riding the *same* `/api/profile/stats` fetch the points lane makes — **one stats fetch per mount**, not two) and self-heals any owed tier, covering a crash/offline gap between a pangram write and its tier POST. Accepted bounded loss: a pangram found offline and never posted before day-rollover is a permanent set undercount (same stance as a missed one-shot; no outbox built).
- **Own Restore merge `planPangramMerge`** (pure, keyed on the composite `(puzzle_date, word)`) wired into `restore()` beside the achievement merge — two devices **union**; double-count on merge is impossible by construction (set union + UNIQUE dedup, never a counter).
- **Retention — never swept.** `player_pangrams` joins `game_scores` / `player_achievements` as append-forever; `/api/cleanup-scores` must never touch it (regression-locked).
- **TrophyCase generalized.** Each tiered badge now reads its own live value (`leksokipos_points` for points, `pangram_count` for pangrams) off `/api/profile/stats`; chips light on `earned.has(tierId) || value >= threshold` and the "X / N" denominator uses a generic `nextTierThreshold(tiers, value)`.

## Amendment (2026-07-18) — retiring the perfect-round / Τζιμάνι concept, and the frozen-id rule's first deliberate exception

The operator decided the "found every word in a daily puzzle" feat is too demanding to reward, so the **perfect-round / Τζιμάνι concept was removed from all four surfaces**: the `leksokipos-tzimani` one-shot achievement (catalog + detection), the `tzimani_count` Lifetime Stat cell, the 🏛️ leaderboard glyph, and the `is_perfect` score wire (both Leksokipos and Leksoplegma, which posted a hint-free round as perfect). Leksokipos still detects "all words found" as a local **completion state** (board lock + "ΤΟ ΠΕΘΑΝΕΣ" message) — that is a game mechanic, not a reward, and stays.

**Frozen-id exception (the reasoning the Consequences bullet points here).** The freeze rule says an `achievement_id` FREEZES on first deploy — renaming/removing it orphans earned rows. This is the **first deliberate exception**: `leksokipos-tzimani` is both **retired from the catalog** *and* has its **earned rows deleted from prod** (`DELETE FROM player_achievements WHERE achievement_id = 'leksokipos-tzimani'`). Retiring alone would leave orphaned rows; deleting the rows alongside it means the id points at nothing and is **safe to re-award later under different conditions** (that redesign is parked, not part of this change). Deleting earned rows is normally forbidden precisely because "achievements are worthless if losable" — the exception is justified here because the feat itself is being withdrawn, so there is no earned progress worth preserving. `ALL_ACHIEVEMENT_IDS` derives from the catalog, so `/api/achievements` rejects the id automatically once it leaves the catalog.

**DB.** The `game_scores.is_perfect` column is **kept** (no migration) — data stays, nothing reads it; an optional drop can ride a future migration.

## Amendment (2026-07-18) — `player_words`, a lane-C sibling for the Words by Length card

A capture-only feature (no badge): the Profile Page's **Words by Length** card shows how many valid words a player has found, per length. This is **data-class 3** (an append-only set whose aggregate is the read), so it reuses the `player_pangrams` shape verbatim rather than inventing a mechanism.

- **New table `player_words`** (`migration 20260718120000`) — a **sibling of `player_pangrams`, not a subset of it** (a later merge of the two is possible cleanup, not now). `(id, device_uuid, puzzle_date, word, length, game_id, created_at)`, `UNIQUE(device_uuid, puzzle_date, word)`, anon RLS = SELECT+INSERT only (the `20260716120100` posture), append-forever — never swept. Two columns beyond the pangram shape: **`length smallint`** stamped server-side, so the per-length read aggregates on the column and **never fetches rows** — this is the fastest-growing table on the platform (~20–40 rows/player/day), the exact case soul.md's Fluid-CPU rule guards; and **`game_id text DEFAULT 'leksokipos'`** as cheap future-proofing (Leksokipos is the only Game with free-form found words today) — left **out of the UNIQUE** for now to match the route's `ON CONFLICT` target and the single-game reality, widened when a second Game needs it.
- **Route `POST /api/words`** — insert-if-absent, mirrors `/api/pangrams`; the server runs zero validation and bounds junk by shape (`sanitizeFoundWords`: `normalizeLetters`, a `^[α-ω]{MIN_WORD_LENGTH,24}$` filter, de-dupe, 200/request cap) + `isISODate`. It stamps `length` from the normalized word.
- **Read `GET /api/profile/words`** — aggregates in Postgres via the **invoker-rights** `player_words_by_length(p_device_uuid)` RPC (the open anon SELECT policy already authorizes the read; no `SECURITY DEFINER`), then folds the sparse `{ length, count }` rows into fixed display buckets (`bucketWordsByLength`). *(Buckets narrowed to 10/11/12 + a "13+" tail by the 2026-07-26 amendment below — the card only shows long words now.)* Deliberately **off** the hot `/api/profile/stats` route, which already fans out three queries. 60s private cache.
- **Capture = a 4th `useAchievementSync` lane** — delta-posts newly-found `foundWords` (per-word ref); **display-only, so it derives no tier** and ignores the returned count. The mount self-heal is the natural re-derive from `foundWords` (the ref starts empty each mount, the whole found set re-posts, insert-if-absent makes the overlap a no-op). Same gates as the pangram lane, and it **rides the `enabled = FEATURE_FLAGS.achievements` master switch** — the flag's "no writes while off" contract is honoured, so pre-launch (beta) word history is deliberately **not** captured; this data is the ADR's launch-reset class either way. Preserving it for future badge calibration is an explicit later decision, not a default.
- **Restore merge `planWordsMerge`** — a verbatim clone of `planPangramMerge` (composite `(puzzle_date, word)` dedup), wired into `restore()` beside the pangram merge; union + UNIQUE dedup, never a counter.
- **Badges over this data are parked** (issue `12-badge-ideas-parked.md`) — the table is designed to support them (the `length` dimension is retained), but none ship here.

## Amendment (2026-07-18) — badge glyphs + the player-selected display badge

Grilled and shipped the same day (two slices). Every catalog entry now carries a **`glyph`** (single emoji, a plain display string — interim art until icons: 🌱 Πρώτα Βήματα, 👑 Στην Κορυφή, 🚂 Σιδηρόδρομος, 🌾 Θεριστής, ✍️ Κυνηγός Πανγκράμ, 💎 Συλλέκτης Πόντων), rendered on earned Trophy Case tiles in place of the generic 🏆. On top of that, a player may select **one** earned achievement as their **display badge**, shown beside their name on **all six game leaderboards** (badge = player identity, like the display name; earning stays Leksokipos-only for now).

- **Selection is a mutable *preference*, not an earned fact** — so it does NOT get fact rows. It lives as one nullable column, `player_profiles.selected_badge_id` (migration `20260718130000`), storing the **base achievement id, never a tier id**. NULL = no badge (opt-in default; tapping the selected tile again clears it). This does not contradict this ADR's "deliberately not stored on `player_profiles`" — that rejection was for anonymous end-of-game *fact* writes; the selection write goes through a service-role route, so owner-scoped RLS is no obstacle, and the profile table is exactly where a per-player preference belongs. RLS posture on `player_profiles` is unchanged.
- **Write = `POST /api/profile/badge`** (route envelope): validates the id is a real catalog badge (`SELECTABLE_BADGE_IDS`, base ids only — 400 on unknown/tier id) **and** that the device holds a qualifying earned `player_achievements` row (`qualifyingEarnedIds`; any tier counts for a tiered badge — 403 on unowned). Lazily creates the profile row on first pick. `GET` returns the current selection. The Trophy Case picker is UI over the same gate: locked tiles are inert, so players start with zero options and each earn unlocks one; the server check is the backstop against curl-fake prestige.
- **Tier resolves at read time, never stored.** The leaderboard `GET /api/game-scores` fans out to `player_profiles` (+ `player_achievements` for tiered selections) for the returned device ids and resolves the **highest earned tier** per row (`resolveDisplayBadge`). Self-healing: a tier upgrade needs no write-back; a **dangling tiered selection** (e.g. post-launch beta reset) with no earned tier rows renders no badge, while a one-shot trusts its write-validated id.
- **Row rendering:** a distinct `LeaderboardBadge` chip **after** the plain name — never text concatenated into the name string — glyph plus, for tiered badges, the highest-tier medal (🥉/🥈/🥇, `TIER_MEDALS`), with visible dividers (`lbBadgeChip`/`lbBadgeMedal` recipes, semantic tokens).
- **Out of scope, parked** (issue `12-badge-ideas-parked.md`): multiple displayed badges + precedence, custom icon art, non-Leksokipos earning.

## Amendment (2026-07-26) — the word-length ladder + a ≥10 tracking floor on `player_words`

Σιδηρόδρομος was a `≥10 letters` one-shot; it becomes the first rung of an **exact-length ladder** and `player_words` is narrowed to only track words that long. This closes issue 14 (the `player_words` storage-cost concern) by construction rather than by optimizing the table: a word of 10+ letters is rare, so both the table's growth and the card's scope shrink to the same small set.

- **Exact-length one-shots, not `≥`.** `detectEarnedAchievements` now earns a badge when a found word is of **exactly** `N` letters, for each `N` in `achievementTuning.wordLengthBadges` = `[10, 11, 12, 13]`. A 13-letter find earns only the 13 badge — each length is its own accomplishment, and a 14+ word earns none (the card's "13+" tail still counts it). Σιδηρόδρομος keeps its frozen id `leksokipos-sidirodromos` (= 10); the new rungs are the frozen ids `leksokipos-word-11/12/13` (Υπερταχεία 🚄, Νταλίκα 🚛, Σεντόνι 🛏️). The catalog entries + hints are **generated** from `WORD_LENGTH_BADGES`, whose lengths come from tuning and whose id/copy are frozen here — a configured length with no frozen meta throws at module load.
- **Storage floor derived from the ladder.** `WORDS_MIN_TRACKED = min(wordLengthBadges) = 10` and `WORDS_TAIL_START = max(...) = 13` both derive from the same config, so the card buckets (10/11/12 + "13+"), the badges, and the write floor **cannot drift**. `POST /api/words` drops any find below `WORDS_MIN_TRACKED` after `sanitizeFoundWords` (sanitize is unchanged — it still floors at the game's `MIN_WORD_LENGTH`; the ≥10 rule is a distinct business filter in the route). The `useAchievementSync` capture lane still posts the whole found set; the server is the single authoritative floor.
- **One-shot cleanup.** Migration `20260726120000` runs `DELETE FROM player_words WHERE length < 10` — idempotent, small (the table is dark behind `FEATURE_FLAGS.achievements` and launch-reset class anyway). Kept in sync with `WORDS_MIN_TRACKED` by comment; SQL can't import the constant.
- **Unchanged:** the `player_words` schema (the `length` column already exists), the merge (`planWordsMerge`), retention (never swept), and the tiered-badge medal system (this is four one-shots, so the 3-medal `TierName` is untouched).

## Amendment (2026-08-06) — the catalog rebuild: one milestones table, two frozen-id exceptions, and the podium lane deleted

Grilled from ticket 08 (podium badges) and the operator's follow-on catalog review. The ticket asked a narrow
question — which podium tiers, which thresholds — and the answer turned out to be **no podium badge at all**,
which then exposed a set of larger calls about what the catalog is and how its inputs are stored. All of it is
recorded here because every item below is hard to reverse *after launch* and free before it.

**The pre-launch window is what makes this affordable.** All beta trophy data is wiped at official release
(already this ADR's stance), so ids are cheap to change *right now* and permanently expensive the day after.
Every id decision below deliberately spends that window rather than carrying a compromise forever.

### 1. Podium badges: rejected, and the lane behind them is deleted

Tiered podium badges do **not** ship. The operator's reason is the load-bearing one: **podium slots are fixed
at three while the audience grows**, so any "finished top-N" badge gets strictly harder over time — first place
worst, top-three the same failure three times slower. Measured on 2026-08-06: 44 days, 365 scores, 8.3 players
per day, top device 16 firsts in 28 days played. Those numbers make the badge look easy today and make it
unreachable at public scale; that is a metric problem, not a threshold problem, so no tuning fixes it.

A percentile metric ("top 10% of the day's board") *is* audience-proof, and was rejected too: at 8 players a
day the top 10% is one player, so it would be **harsher than first place** until real traffic arrives.

**Consequence — the whole podium lane is removed, not just the badge.** The Βάθρο cell on the Profile page
(`LifetimeStatsStrip`), the three `leksokipos_*_place_count` response fields, the cross-device query in
`/api/profile/stats`, `src/lib/placement.ts` (`countPodiumFinishes` / `countFirstPlaceFinishes`), their tests,
and the **Podium Finish** + **Podium Counts** glossary terms in `CONTEXT.md` all go. That query is the one part
of the stats route that fetches **every device's** Leksokipos rows — its own comment flags it as the piece to
re-engineer before scale — so with nothing consuming it, deleting it retires a launch scaling risk rather than
leaving a paid query feeding a deleted cell. The reserved `leksokipos-first-place-*` id prefix is released
unused; no row ever carried it.

### 2. `player_milestones` — one table for every countable input

Two badges become tiered (§3) and **neither has a counter**. Points and pangrams have sources; "reached the top
rank" has none, and it is **not derivable from `game_scores`** — rank needs each puzzle's genius threshold,
which the server never sees. So new capture was unavoidable, and taking one migration to also consolidate the
existing set tables was cheaper than adding a third one beside them.

`player_milestones(device_uuid text, puzzle_date date, kind text, detail text)`, `UNIQUE(device_uuid,
puzzle_date, kind, detail)`, insert-if-absent, append-forever, never swept — the same posture as every table in
this ADR. It absorbs **`player_pangrams`** (`kind='pangram'`, `detail`=the word) and **`player_words`**
(`kind='word'`, `detail`=the word, keeping the ≥10 floor of the 2026-07-26 amendment), and adds
`kind='top_rank'` and `kind='tzimani'` with an **empty** `detail`.

- **The trap, and it is a real one:** Postgres treats `NULL`s as **distinct** in a unique index, so a null
  `detail` would let the same milestone insert twice and silently break insert-if-absent — the exact guarantee
  this ADR is built on. Use `''` for detail-less kinds, or declare the index `NULLS NOT DISTINCT` (Postgres 15+;
  the project is on 17, so both are available). Do not leave it nullable and untreated.
- **Points stay out.** Lifetime points is a `SUM` over `game_scores` — derived, never stored (`CONTEXT.md`
  data-class 2). There are no rows to move, and materialising the total would create a second source of truth
  that can drift from the scores it is computed from.
- **`player_achievements` stays separate.** It holds earned *badges* — the output. `player_milestones` holds the
  *inputs* the tier crossings are computed from. Merging them would put a derived conclusion in the same table
  as its evidence.

### 3. Two one-shots become tiered; both feed off `player_milestones`

- **Στην Κορυφή** — was a one-shot on reaching the top rank; becomes tiered at **1 / 10 / 25** lifetime
  top-rank days (`kind='top_rank'`).
- **Θεριστής → Τζιμάνι** — the 80%-of-words one-shot becomes tiered at **1 / 5 / 10** lifetime qualifying days
  (`kind='tzimani'`). **`achievementTuning.theristisFoundRatio` stays 0.8**: the ladder counts *days at 80%*,
  it does not climb the ratio. A 90/100% ladder was rejected — a 100% rung is the old perfect-round concept
  back under a new name, which this ADR retired in the 2026-07-18 amendment.

Both thresholds live in `achievementTuning.ts` as balance knobs, like every other tier.

### 4. Frozen-id rule — the second and third deliberate exceptions

The frozen-id rule (Decision §1, Consequences) has one prior exception, `leksokipos-tzimani` in the 2026-07-18
amendment. Two more are granted here, both licensed by the pre-launch wipe and by nothing else:

- **`leksokipos-first-daily` (Πρώτα Βήματα) is removed** — catalog entry deleted, id retired permanently, never
  reused. "You played once" is not an accomplishment worth a tile.
- **`leksokipos-tzimani` is revived** for the tiered 80% badge, in preference to keeping
  `leksokipos-theristis` with new display copy. Reviving it costs nothing while the data is wiped, and it
  avoids an id and a name that disagree forever. Tier ids are `leksokipos-tzimani-chalkino/-asimenio/-chryso`.
  **This resolves parked item 1 of `.claude/handoffs/badgeIdeas.md`** — that item asked for exactly this, Τζιμάνι
  re-awarded under less demanding conditions than "found all the words".

**After launch this window shuts.** Post-release, the rule is absolute again: an id may be added, never renamed,
removed, or revived.

### 5. Tier ladder: three rungs, with one standing exception

Three rungs everywhere — `chalkino` / `asimenio` / `chryso`. A longer ladder was considered for pangrams and
points and rejected for now. **Μακρυλέξης keeps its fourth rung** (`diamanti`, the 13-letter word): its rungs
are exact word lengths, not a cumulative count, so dropping 13 would delete a real accomplishment to satisfy a
number. `TierName` therefore keeps all four names.

### 6. Display Badge: exactly one, permanently

A player displays **one** badge. This was previously parked as "multiple displayed badges + precedence rules";
it is now a **closed question, not a deferred one** — no precedence system will be built, so nothing downstream
needs to anticipate one. Already the shipped behaviour (`player_profiles.selected_badge_id`, singular), so this
records intent rather than changing code.

### 7. Badge art: emoji glyphs are retired, but not by this ADR

The operator's verdict on emoji glyphs: they read as cheap and they do not scale cleanly. They also collide
with player names — `display_name` has **zero validation** (`/api/profile` does `trim()` and falls back to
`Ανώνυμος`), so an emoji in a name sits beside an emoji badge and the two are indistinguishable. Emoji in names
stays **allowed**; the badge changes instead.

Every `glyph` becomes a drawn SVG mark, and tiers stop using the 🥉🥈🥇 `TIER_MEDALS` in favour of a tier
treatment on the mark itself. **Art is display copy — no id, no schema, and no earned row depends on it**, so
this is fully decoupled and can land whenever. Scope, the five marks, the tier treatment, the leaderboard chip
and the Trophy Case states are all specified in `.claude/handoffs/badgeVisualSystem.md`.

**Note the structural consequence of §3 + §4:** with Πρώτα Βήματα gone and Στην Κορυφή and Τζιμάνι tiered,
**every remaining badge is tiered** — the catalog has no one-shot entries left. The tier treatment is therefore
not decoration on some badges; it is how every badge in the game reads.

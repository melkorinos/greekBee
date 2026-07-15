# Greek Word Games Platform

A browser-based platform hosting multiple daily Greek word games. Each game is isolated in logic and persistence but shares a common shell, navigation, and device identity.

---

## Glossary

**Platform** — The entire application: shell, navigation, persistence, and all games. Named **Leksarxeia** (the brand shown in the Shell header and picker). (Not: app, site)

**Game** — A distinct word-game mode. Currently: Leksokipos, Leksiarxeio, Leksindeseis, Vres Tin Frasi, Stavrolekso, Leksodromia, Leksoplegma.

**Session** — One continuous play of a Puzzle on a given device. Persists across refreshes until the Puzzle changes. Each game persists different fields (Leksokipos: score + found words; Leksiarxeio: guesses per length; Leksindeseis: solved groups + mistakes; Vres Tin Frasi: guesses + status; Stavrolekso: typed cells + solved slots per puzzle ID). Leksokipos daily Sessions are also synced to the server (see `game_state` table) for cross-device restore via TransferCode.

**DeviceId** — Stable anonymous UUID generated once per browser, shared across all games. Not permanently unique per browser: a browser *adopts* another's DeviceId on TransferCode claim or Sign-in Restore, so one DeviceId can identify all of a player's browsers. Treated as a **secret credential** — knowing it authorises score posts and profile access, so it must never appear in public URLs, links, or payloads visible to other players. (Not: userId, playerId)

**DisplayName** — Player-chosen name shown on leaderboards. Optional. (Not: username)

**Guess** — A player's submitted attempt: one word in Leksiarxeio, four words in Leksindeseis, one full phrase in Vres Tin Frasi. (Not: attempt, submission)

**Leaderboard** — Ranked Scores for a specific Daily Puzzle, 7-day rolling window. Only Daily Puzzles have one. (Not: rankings)

**Puzzle** — A single playable instance of a Game on a given date. Types: `LeksokiposPuzzle`, `LeksiarxeioPuzzle`, `LeksindeseisPuzzle`, `VresTinFrasiPuzzle`, `LeksoplegmaPuzzle`. Leksodromia has no stored puzzle type — its daily round is derived deterministically from the Leksiarxeio Word Pools. (Not: board, level)

**Daily Puzzle** — A Puzzle shared by all players on a given day (date-scoped ID).

**Pre-built Puzzle** *(Leksokipos)* — Batch-generated, quality-filtered, stored in `puzzles-el.json`. Every Daily Leksokipos Puzzle is Pre-built. (Not: curated)

**Community Puzzle** — A Puzzle submitted by a player, admin-approved, and queued as the Daily Puzzle for Leksiarxeio or Leksindeseis. Primary source for both games; static pools are fallback only. Carries optional `submitter_name` shown during play. Row is deleted immediately on consumption. (Not: curated puzzle — retired)

**Community Puzzle Lifecycle** — The shared state machine for every Community Puzzle: submit → `pending` → approve (UPDATE status) or reject (DELETE row) → **consume** (claim the oldest approved row when a game serves its Daily Puzzle, then DELETE it). One module (`src/lib/communityPuzzleLifecycle.ts`) owns all four transitions: auth, parsing, insert, list, and review back the `/api/community-puzzles/*` routes; `consumeApprovedPuzzle(table)` backs the three game data loaders (Leksiarxeio, Vres Tin Frasi, Leksindeseis), which are thin mappers from the claimed row to their own Puzzle shape plus a static fallback. Per-game variation (table, validation adapter, list shape, public approved list) enters as config declared in each game's route file; the validation adapter itself is a pure function in the game's lib (`src/games/<game>/lib/validateSubmission.ts`), imported only by that game's route so word-pool imports stay out of the other edge bundles. Stavrolekso's adapter is additionally shared by the creator-edit route (PATCH) and the maker's pre-flight checks, so an edit can never regress a puzzle below the submission invariants. Stavrolekso never consumes — its rows persist after approval. (Not: submission flow, community puzzle API)

**Custom Puzzle** *(Leksokipos only)* — Player-constructed from a 7-letter combination. ID: `custom-{center}-{sortedOuter}`. Never on the Leaderboard.

**Puzzle ID** — `YYYY-MM-DD-{language}` for Leksokipos Daily; `YYYY-MM-DD-wordle-{length}` for Leksiarxeio (frozen — renaming wipes localStorage sessions); `custom-{center}-{sortedOuter}` for Custom; `YYYY-MM-DD-vresi` for Vres Tin Frasi; plain `YYYY-MM-DD` for Leksodromia and Leksoplegma (the date **is** the daily puzzle id — Leksoplegma's generator ids are internal to the batch and never persisted). Leksindeseis has no `id` field — `date` is the effective ID.

**Normalised Word** *(Leksokipos)* — Lowercased, accent-stripped, final ς → σ via `normalizeLetters()`. All stored words are normalised; raw input is normalised on arrival. (Not: cleaned, sanitised)

**Center Letter** — The mandatory letter every Leksokipos word must contain.

**Outer Letters** — The six non-mandatory letters in a Leksokipos Puzzle.

**Valid Words** *(Leksokipos)* — All words accepted by a Puzzle. Pre-computed for Pre-built Puzzles; computed on-demand for Custom. (Not: answers, word list)

**Pangram** — A Leksokipos word using all 7 puzzle letters. +7 pt bonus. Every Pre-built Puzzle has ≥1.

**Score** *(Leksokipos)* — Accumulated points: 4-letter words = 1 pt; 5+ = 1 pt/letter; Pangram +7 pt bonus.

**Max Score** *(Leksokipos)* — Sum of all Valid Word scores, scaled to 85%, then passed through a soft cap: unchanged below the knee (`SOFT_CAP_KNEE`), logarithmically compressed above it (`SOFT_CAP_K`) so the value keeps rising with a puzzle's richness instead of pinning to one number — no hard ceiling. Used for Rank thresholds and as the Endgame Zone trigger.

**Endgame Zone** *(Leksokipos)* — Scoring range entered when `score ≥ maxScore` (daily puzzles only). The rank-ladder popup is replaced by an endgame panel showing: total Valid Words remaining, pangrams remaining, and a count per word length (longest first). No hints are given.

**Τζιμάνι** *(Leksokipos)* — Secret rank achieved when 0 Valid Words remain (player has found every word). Not shown in the rank ladder. "ΤΟ ΠΕΘΑΝΕΣ" is displayed in the word-feedback area; the letter input is disabled. Marked with 🏛️ on the Leaderboard. Extremely rare in practice.

**Rank** — Score milestone: Ψαράκι → Έτσι κιέτσι → Οκέι → Για πάμε → Θηρίο → Φωτιά → Γκουρού → Απολυτότητα. (Not: level, tier)

**Found Words** — Ordered list of Valid Words submitted in the current Session.

**Theme** — Platform-wide light/dark mode. Toggle in Shell header. Persisted in `localStorage["theme-preference"]`. Applied via `.dark` class on `<html>`. Does not follow OS preference.

**Grid Variant** — Leksokipos display style: **Pie Slice** or **Flower**. Persisted in `localStorage["leksokipos-variant"]`. No effect on puzzle data or scoring.

**Word Pool** *(Leksiarxeio)* — Full normalised word list per Length (`words-4.json` … `words-8.json`). Drives both Answer selection and Guess validation.

**Answer** *(Leksiarxeio)* — The secret word. Selected deterministically by date from the Word Pool, or from a Community Puzzle row. (Not: solution)

**Tile** — One letter cell in the Leksiarxeio grid. States: `correct`, `present`, `absent`, `empty`, `pending`.

**Length** *(Leksiarxeio)* — Letters in the Answer. Supported: 4–8. Each Length is a separate Puzzle with its own Session.

**In-game Points** *(Leksiarxeio)* — Per-length score from `scoreLeksiarxeio()`: 6 pts (1 guess) … 1 pt (6 guesses). Stored per Length in `game_scores` (`word_length` column). Summed for the Leaderboard Score.

**Leaderboard Score** *(Leksiarxeio)* — Sum of In-game Points across all 5 Lengths for a given date. Higher is better. Failed/unplayed length = 0 pts. API field named `score`. Display label: "Σκορ".

**Phrase** *(Vres Tin Frasi)* — The daily answer: a 3–4 word Greek saying or common expression. Each word is 2–8 letters. The phrase must have cultural/linguistic coherence — not random words. Stored as display form (accented, natural case); normalised at runtime for evaluation. (Not: sentence, expression)

**Phrase Pool** *(Vres Tin Frasi)* — Source of daily Phrases. Community-approved phrases take priority; static JSON of ~500 pre-computed Greek phrases is the fallback. Stored in `community_vrestifrasi_puzzles` (community) and `phrases-el.json` (static).

**Phrase Guess** *(Vres Tin Frasi)* — A player's submitted attempt: a sequence of words exactly matching the answer Phrase's word count and each word's length. Each word must exist in the word pool (2–8 letters). (Not: attempt)

**Phrase Tile** *(Vres Tin Frasi)* — One letter cell in the Vres Tin Frasi grid. States: `correct` (green), `present` (yellow), `misplaced-word` (purple), `absent` (grey), `empty`, `pending`.

**Misplaced-Word** *(Vres Tin Frasi)* — Tile state (purple): the guessed letter appears in the answer Phrase but in a different word than the one it was guessed in. Evaluated after greens are resolved: remaining answer letters form a cross-phrase pool; a letter not in its own word's pool but present in another word's pool → misplaced-word. Keyboard priority: `correct` > `present` > `misplaced-word` > `absent`. (Not: present — that is yellow, wrong position within the same word)

**Score** *(Vres Tin Frasi leaderboard)* — Points from `scoreVresTinFrasi`: 6 pts for a 1-guess win → 1 pt for a 6-guess win; a loss is 0. **Higher is better** (same scale as Leksiarxeio In-game Points), sorted descending like every other board (ADR 0014). Stored in `game_scores` with `game_id = "vrestifrasi"`; API field named `score`. The player still sees their raw attempt count in-game; only the leaderboard currency is points. (Converted from the retired lower-is-better *Attempt Count* — ADR 0014. Not: attempt count, προσπάθειες)

**Category** *(Leksindeseis)* — Label naming a Group of 4 words. Hidden until the Group is solved. (Not: theme, topic)

**Group** *(Leksindeseis)* — Exactly 4 words sharing a Category. A Puzzle has 4 Groups. (Not: category — use only for the label)

**Difficulty** *(Leksindeseis)* — Integer 1–4. 1 = easiest (yellow), 4 = hardest (purple). Display only.

**Selection** *(Leksindeseis)* — Up to 4 highlighted words before a Guess is submitted. Cleared after each Guess.

**Mistakes Remaining** — Wrong Guesses left before game over. Starts at 4.

**Profile** — Named identity linking a DisplayName to a DeviceId in `player_profiles`. Shared across games. (Not: account, login)

**ProfileLinked** — Boolean in PersistenceEnvelope: true when this device has a Profile row. (Not: logged in)

**AuthLinked** — Boolean: true when this device's Profile has an associated Google account (`auth_user_id` set on its `player_profiles` row). `AuthLinked` always implies `ProfileLinked`. The auth account is the durable identity anchor; a device is one session of it (ADR 0012). (Not: logged in — use AuthLinked)

**Sign-in Restore** — Signing in with Google on a device whose account already has a linked Profile: the device adopts that Profile's DeviceId (same mechanic as TransferCode claim), then any pre-existing local history is merged — best Score per Puzzle wins, the account Profile's DisplayName wins, and the device's old Profile row is deleted. The player lands on the Profile Page with a welcome-back message showing what came back. **Exception — occupied device** (ADR 0012 amendment, issue 01): if the current device's Profile row is already AuthLinked to a *different* account (a shared browser someone forgot to Disconnect), the merge/delete is skipped — the caller adopts their own canonical identity (or is minted a fresh DeviceId if they have none) and the resident owner's row is left untouched. (Not: account recovery, login sync)

**TransferCode** — 6-char alphanumeric code (no I/1/O/0) for cross-device identity migration. 24h TTL, single-use. Retained indefinitely as the no-account fallback; its claim-adoption mechanic is also the foundation of Sign-in Restore.

**Achievement** — A permanent award earned once per player for reaching a game or platform milestone. Earned anonymously (keyed by DeviceId), durable once AuthLinked, losable before. Earned means earned forever — never revoked by later score changes, merges, or rule changes. One-shot or tiered (Χάλκινο → Ασημένιο → Χρυσό). (Not: badge — that's its visual token)

**Badge** — The visual token of an Achievement: a full tile in the Trophy Case, or a single inline glyph on Leaderboard rows (🏛️ for Τζιμάνι is the precedent). (Not: achievement — that's the earnable condition)

**Profile Page** — The standalone surface where a player views their own identity state (anonymous / ProfileLinked / AuthLinked), edits their DisplayName, sees Lifetime Stats, and browses their Trophy Case. Also where Sign-in Restore lands the player to show what came back. v1 shows only the viewer's own profile — viewing other players' profiles is deferred until a public identifier exists (DeviceId is secret). (Not: account page, settings page)

**Trophy Case** — The full Achievement display on the Profile Page: every catalog entry rendered, earned Badges lit, locked ones greyed with their unlock hint. (Not: badge list, achievements tab)

**Lifetime Stats** — Per-player aggregates over full `game_scores` history (append-forever makes them safe): total points, puzzles played, Τζιμάνι count, pangram count (from the separate `player_pangrams` set, not `game_scores`), and First-Place Count (Πρωτιές — Leksokipos only in v1). Streak is defined below but not yet surfaced in the strip. Keyed by DeviceId — never `auth_user_id` (Sign-in Restore makes the adopted DeviceId canonical, so one key serves anonymous and AuthLinked players alike); Daily Puzzles only (Custom Puzzles never post scores). (Not: statistics, records — records are all-time bests, a parked pillar)

**First-Place Finish** — Being rank 1 on a Game's Daily Puzzle Leaderboard for one `puzzle_date`. Ties share rank 1 — every player who matches the day's top score finished first (consistent with the Leaderboard's count-of-better-scores rank formula). Since every Leaderboard is higher-is-better (ADR 0014), "first" is simply the day's maximum `score`. (Not: win, top score)

**First-Place Count** — The lifetime tally of a player's First-Place Finishes, shown as **Πρωτιές** in Lifetime Stats. Leksokipos-only in v1; extends per-Game later (each Game contributes its own daily firsts). **Derived** from append-forever `game_scores` (data-class 2), never stored — computed by `countFirstPlaceFinishes` (`src/lib/placement.ts`) over all of a Game's rows, index-backed by `game_scores_game_date_score_idx`. Tiered First-Place Badges are a deferred follow-up (frozen `leksokipos-first-place-*` ids chosen when built). (Not: wins count)

**Streak** — Consecutive calendar days on which a player scored at least one Daily Puzzle in any Game (platform-wide, not per-Game). Derived from distinct `puzzle_date`s in `game_scores`; Custom Puzzles excluded. Current and Best Streak show in Lifetime Stats. (Not: per-game streak)

**Disconnect** — Ending a device's identity: the device gets a fresh DeviceId and cleared local state, becoming a brand-new anonymous player. Both profile disconnect and Google sign-out mean this — "this device is no longer this person." Nothing server-side is deleted; signing back in (or claiming a TransferCode) restores everything. (Not: logout, unlink)

**Admin Restore** — Break-glass recovery when a player loses their identity: admin looks up email → `auth_user_id` → DeviceId in the DB and issues a TransferCode for it via SQL (see `docs/admin-restore.md`). The player claims the code normally. (Not: account recovery — that's the player-facing Sign-in Restore)

**Leksikastirio** — Community word-court (λεξικό + δικαστήριο). Players vote on Nominations; admins triage them. Also hosts Community Puzzle review tabs in Admin Mode. (Not: word review, suggestions page)

**Nomination** — Proposal to add or remove a word from `words-el.json`. Has a Direction, DeviceId, optional name/note, and status. (Not: suggestion, report)

**Direction** — `"add"` or `"remove"` intent of a Nomination.

**Nomination Status** — `"pending"` → `"accepted"` or `"rejected"`.

**Vote** — Player endorsement of a Nomination, stored as `(nomination_id, device_id)`.

**Admin Mode** — `?admin=<secret>` URL param matching `ADMIN_SECRET`. Reveals Approve/Reject on Nomination Cards and Community Puzzle review tabs. Not linked from nav.

**Flag** — In-game Leksokipos action that opens NominationModal with `direction: "remove"`.

**Feedback** — A player-submitted message to the maintainer, delivered by email (via FormSubmit). Not persisted server-side, not moderated, and carries no lifecycle. Distinct from a **Nomination** (a word proposal, DB-backed, voted on, admin-triaged) and from the Leksokipos removal-`reports` slice (client-only dedup list). One global entry point in the Shell; auto-attaches current URL, user-agent, and DeviceId as debugging context. MVP is free text only; an optional user-uploaded screenshot is deferred (the free email relays don't attach files). (Not: bug report, report, suggestion, nomination)

**Stavrolekso** — Community crossword game (σταυρόλεξο). Crosswords are community-submitted, admin-approved, and never deleted — players browse the full approved pool. Not auto-generated. (Not: crossword)

**Stavrolekso Puzzle** — A single crossword: a grid with black squares, numbered cells, and a clue per slot (Across + Down). Optional title. Grid is always square; supported sizes: 9×9, 13×13, 15×15. Lifecycle: `pending` → `approved` (permanent) or deleted on rejection. Unlike other Community Puzzles, rows are never consumed. Stored as slot-based JSONB: `{ width, height, blackSquares: [row,col][], slots: [{ number, direction, startRow, startCol, answer, clue }][] }`. Validated against `words-el.json` (soft warning on unknown words).

**Edit PIN** — Creator-chosen alphanumeric code (4–8 chars) set at Stavrolekso Puzzle submission. Stored plain on the row. Combined with the puzzle's unique ID to authenticate edit access. Only valid while the puzzle is `pending`. (Not: edit token, edit code)

**Slot** — A contiguous horizontal or vertical run of white cells in a Stavrolekso grid, bounded by black squares or the grid edge. Each Slot has a direction (Οριζόντια/Κάθετα), an auto-assigned number, and one plain-text clue (letter count appended by the UI). Minimum length: 3. (Not: word, entry)

**Οριζόντια** — Across direction in a Stavrolekso Puzzle. (Not: horizontal, across)

**Κάθετα** — Down direction in a Stavrolekso Puzzle. (Not: vertical, down)

**Leksodromia** — Daily anagram sprint (λεξοδρομία — UI renamed to greeklish 2026-07-14): 10 words (2 per Length 4–8, ascending), each shown as a Scramble to unscramble as fast as possible. Points decay with time (Decay Scoring); no stored puzzle — words are selected deterministically by date from the Leksiarxeio Word Pools, never colliding with Leksiarxeio's same-day Answer. (Not: anagram game, speed round)

**Scramble** *(Leksodromia)* — The deterministic shuffled form of an answer word, shown as a tile rack. Multiset-preserving and never identical to the answer. (Not: shuffle, rack — the rack is its visual layout)

**Decay Scoring** *(Leksodromia)* — Per-word points start at a base for its Length and decay linearly to a floor (25% of base) over 45 s of active solve time (the clock pauses while the tab is hidden). Each Hint costs 30% of base (max 2 per word); a solved word always scores at least 5 pts, so solving always beats a Skip. Perfect round = 1000. (Not: timer scoring, countdown)

**Skip** *(Leksodromia)* — Passing on the current word via the two-phase «Επόμενο» button. The FIRST skip requeues the word at the end of the run as a Second Chance; only a second skip is final (0 points, into the recap). (Not: pass, give up)

**Second Chance** *(Leksodromia)* — A requeued skipped word coming around again after the first pass. Its decay clock and hint count RESUME from where they were at the skip — never reset, so skipping cannot be used to peek at a word and return to it fresh. Skipping a Second Chance is final. (Not: retry from scratch, redo)

**Hint** *(Leksodromia)* — Reveals the next correct letter as a locked prefix of the answer row. Costs 30% of the word's base points; max 2 per word. **Engine-only at launch**: the reducer and scoring support it but no button exposes it in the UI. (Not: Leksoplegma's Hint — different mechanic and cost)

**Leksoplegma** — Daily word-web (λεξόπλεγμα — UI renamed to greeklish 2026-07-14; 16-tile 4×4 grid): every Required Word lies along an authored path of edges; the player finds words by tracing them. Any Extra Word traced on the web also scores. No timer — points only. Daily Puzzle = date rotation over a committed generator batch, advanced past any puzzle whose Required Words contain Leksiarxeio's same-day Answer. (Not: word search, boggle)

**Trace** *(Leksoplegma)* — An ordered tile sequence built by dragging or tapping along the web's edges (dim or bright alike). A Trace matches a word in either direction (forward or reversed). (Not: path — a Path is the authored answer route)

**Required Word** *(Leksoplegma)* — One of the ~9 authored words of a puzzle, each with its authored Path. Finding all Required Words ends the round. Scores length × 10 pts. (Not: answer, target)

**Collapse** *(Leksoplegma)* — Soft: when a Required Word is found, tiles and edges no longer needed by the remaining unfound Required Words **dim** but stay traceable until the round ends — bright parts still hide a Required Word, dim parts are cleared. Nothing ever leaves the board, so Extra Words are never lost mid-round. Derived state, not a timer. (Not: removal, disappearance — that was the pre-launch hard collapse, reworked 2026-07-14)

**Hint** *(Leksoplegma)* — Reveals a Required Word's start tile and length. Costs 25 pts (score floor 0); max 1 per word. A round finished with zero hints posts as perfect (`is_perfect`). **Engine-only at launch**: the reducer and scoring support it but no button exposes it in the UI — so every live finish currently posts `is_perfect: true`. (Not: Leksodromia's Hint)

**Extra Word** *(Leksoplegma)* — Any valid dictionary word (≥3 letters) traceable along the web that is not a Required Word — exhaustively precomputed per puzzle by the generator. Scores flat points, all round long (soft Collapse); never gates completion and never triggers Collapse. Never auto-submits — many Extra Words are prefixes of Required Words — so it is submitted explicitly (✓ button or drag release). UI: «Έξτρα λέξεις»; code: `bonusWords`. Briefly removed and reinstated on 2026-07-14 — the rejection of real Greek words felt wrong to players. (Not: bonus mechanic, hidden word)

**Offline Lock** — A deliberate client-side state on a Leksokipos Daily Puzzle that blocks browser refresh and in-app navigation, and routes score submissions through the Offline Score Outbox instead of posting directly. Activated via a toggle inside the Leksokipos UI; released manually. Only available on Daily Puzzles. (Not: offline mode, airplane mode, offline play)

**Offline Score Outbox** — A single-entry localStorage record holding the latest pending Leksokipos Score from a locked Session: `{ gameId, puzzleDate, deviceId, score, displayName }`. Written on every word found while Offline Lock is active; overwritten (not appended) on each subsequent word. Flushed to `game_scores` on lock release, or automatically on the next page mount if an entry exists. Kept on flush failure and retried on the next release. (Not: queue, cache, retry buffer)

---

## Database tables (13)

> **Authoritative schema** — columns, types, constraints, RLS policies and indexes live in `supabase/migrations/` (the `*_baseline_remote_schema.sql` baseline plus any later migrations), **not here**. Change the schema only via a new migration file applied with `npx supabase db push`; never edit the live DB without one, or the repo drifts. This table documents each table's **purpose** and the shape of its `jsonb` blobs (which the DDL can't express).

| Table | Purpose |
|---|---|
| `player_profiles` | Device identity: `device_uuid` → `display_name`. Optional `auth_user_id` links a Google account and is the durable identity anchor — authoritative device→account map, unique partial index on `auth_user_id` (ADR 0012; column introduced by ADR 0007). |
| `transfer_codes` | Single-use 6-char codes for cross-device identity transfer, 24h TTL. |
| `game_scores` | Unified leaderboard for all games, keyed by `game_id` (`leksokipos`/`leksiarxeio`/`leksindeseis`/`vrestifrasi`/`leksodromia`/`leksoplegma`) + `device_id`. Leksiarxeio writes one row per `word_length`. Device-keyed only — no `auth_user_id` column; Sign-in Restore makes the adopted DeviceId canonical, so device_id serves anonymous and AuthLinked players alike (the device→account map lives in `player_profiles`). |
| `game_state` | Serialised Session for cross-device sync (Leksokipos daily puzzles only). Blob: `{ foundWords: string[] }`. Pushed after every valid word; pulled on mount when local progress is empty. Both require ProfileLinked. |
| `nominations` | Community word proposals (add / remove a word). |
| `nomination_votes` | Up/down votes on nominations, one per device. |
| `community_leksiarxeio_puzzles` | Player-submitted Leksiarxeio puzzles. One row = all 5 lengths (`data` jsonb `{"4":…,"8":…}`). Deleted on consumption. |
| `community_leksindeseis_puzzles` | Player-submitted Leksindeseis puzzles (`data` jsonb 4-group array). Deleted on consumption. |
| `community_vrestifrasi_puzzles` | Player-submitted Vres Tin Frasi phrases (`data` jsonb `{ "phrase": "…" }`). Deleted on consumption. |
| `community_stavrolekso_puzzles` | Community-submitted crosswords (`data` jsonb slot-based; PIN-gated creator edits). **Never deleted after approval.** |
| `identity_audit` | Append-only log of identity-mapping changes, written by `/api/auth/link` when a link establishes a mapping the profile row didn't already hold. Service-role only (RLS on, zero policies); never pruned. Backs Admin Restore (ADR 0012). |
| `player_achievements` | Immutable earned-Achievement facts: one row = one Achievement (one-shot or tier id) a device earned. `UNIQUE(device_uuid, achievement_id)`, insert-if-absent (never revoked). Open RLS (anon writes, mirrors `game_state`). Append-forever — never swept. Unioned onto the canonical identity on Sign-in Restore (ADR 0013). |
| `player_pangrams` | Append-only pangram find-set (Κυνηγός Πανγκράμ tier progress): one row = one pangram `word` a device found on one `puzzle_date`. `UNIQUE(device_uuid, puzzle_date, word)`, insert-if-absent. Progress = `COUNT(*)`, never a counter. Open RLS, append-forever — never swept. Unioned on Sign-in Restore via `planPangramMerge` (ADR 0013 B2). |

---

## Persistence decisions

**API rate limiting — accepted risk (2026-06-30)**
No per-device rate limiting is implemented on INSERT-capable API routes. RLS policies allow unlimited anon inserts. Decision: accept the risk at current scale. A Supabase row-count alert is the only guardrail (threshold: 50 000 rows on `game_scores`, 5 000 on `nominations`). Revisit with a Redis sliding-window approach (Upstash) when DAU exceeds ~500.

**Nominations retention policy (2026-07-01)**
`pending` and `rejected` Nominations are never deleted. Rejected rows are retained permanently because `NominationModal` uses them to warn players on re-submission (by word + direction). `accepted` Nominations are deleted 30 days after `reviewed_at` is set by `apply-nominations.mjs` — at that point the word is in the JSON and deployed, and the row is pure audit trail. The `reviewed_at` column serves dual purpose: `null` = accepted but not yet applied to the word list; non-null = applied. See ADR 0011.

**`game_scores` is append-forever (2026-07-02; enforced in code 2026-07-05)**
Rows are never pruned. The 7-day leaderboard window is query-side only. Lifetime Stats, Streaks, and the derived-on-read lifetime-point Achievements all read full `game_scores` history, so deletion would silently corrupt them. (Achievements themselves are not backfilled — they start at zero at launch — but their live derivation from post-launch history still depends on nothing being pruned.) When the 50 000-row alert fires, the answer is "raise the alert / optimize storage" — never "prune history." **Until 2026-07-05 this was policy only — the daily `/api/cleanup-scores` cron still deleted `game_scores` older than 10 days (issue 03), so "Lifetime" Stats were really last-10-days stats.** The cron now prunes only the ephemeral tables (`game_state`, `transfer_codes`) governed by `SESSION_RETENTION_DAYS`; `game_scores` is untouched.

**`player_profiles` cleanup — deferred (2026-07-01)**
No deletion policy is implemented. `last_active` is updated on every profile upsert (POST /api/profile) so it reflects genuine activity when cleanup is eventually designed.

---

## Flagged ambiguities

**"Score" is overloaded** — Leksokipos Score = accumulated word points (higher = better). Leksiarxeio Leaderboard Score = sum of In-game Points across 5 Lengths (higher = better). API field is named `score` for interface compatibility only.

**"Valid words" is context-dependent** — In Leksokipos it's the accepted-answer list. In Leksiarxeio it's the guess-validation pool (same file as the Answer pool).

**Leksindeseis Puzzle has no `id`** — Identified by `date` alone. Inconsistent with the other two games; treat `date` as the effective ID.

# Greek Word Games Platform

A browser-based platform hosting multiple daily Greek word games. Each game is isolated in logic and persistence but shares a common shell, navigation, and device identity.

---

## Glossary

**Platform** — The entire application: shell, navigation, persistence, and all games. (Not: app, site)

**Game** — A distinct word-game mode. Currently: Leksokipos, Leksiarxeio, Leksindeseis.

**Session** — One continuous play of a Puzzle on a given device. Persists across refreshes until the Puzzle changes. Each game persists different fields (Leksokipos: score + found words; Leksiarxeio: guesses per length; Leksindeseis: solved groups + mistakes). Leksokipos daily Sessions are also synced to the server (see `game_state` table) for cross-device restore via TransferCode.

**DeviceId** — Stable anonymous UUID generated once per browser. Shared across all games, never tied to a user account. (Not: userId, playerId)

**DisplayName** — Player-chosen name shown on leaderboards. Optional. (Not: username)

**Guess** — A player's submitted attempt: one word in Leksiarxeio, four words in Leksindeseis. (Not: attempt, submission)

**Leaderboard** — Ranked Scores for a specific Daily Puzzle, 7-day rolling window. Only Daily Puzzles have one. (Not: rankings)

**Puzzle** — A single playable instance of a Game on a given date. Types: `LeksokiposPuzzle`, `LeksiarxeioPuzzle`, `LeksindeseisPuzzle`. (Not: board, level)

**Daily Puzzle** — A Puzzle shared by all players on a given day (date-scoped ID).

**Pre-built Puzzle** *(Leksokipos)* — Batch-generated, quality-filtered, stored in `puzzles-el.json`. Every Daily Leksokipos Puzzle is Pre-built. (Not: curated)

**Community Puzzle** — A Puzzle submitted by a player, admin-approved, and queued as the Daily Puzzle for Leksiarxeio or Leksindeseis. Primary source for both games; static pools are fallback only. Carries optional `submitter_name` shown during play. Row is deleted immediately on consumption. (Not: curated puzzle — retired)

**Custom Puzzle** *(Leksokipos only)* — Player-constructed from a 7-letter combination. ID: `custom-{center}-{sortedOuter}`. Never on the Leaderboard.

**Puzzle ID** — `YYYY-MM-DD-{language}` for Leksokipos Daily; `YYYY-MM-DD-wordle-{length}` for Leksiarxeio (frozen — renaming wipes localStorage sessions); `custom-{center}-{sortedOuter}` for Custom. Leksindeseis has no `id` field — `date` is the effective ID.

**Normalised Word** *(Leksokipos)* — Lowercased, accent-stripped, final ς → σ via `normalizeLetters()`. All stored words are normalised; raw input is normalised on arrival. (Not: cleaned, sanitised)

**Center Letter** — The mandatory letter every Leksokipos word must contain.

**Outer Letters** — The six non-mandatory letters in a Leksokipos Puzzle.

**Valid Words** *(Leksokipos)* — All words accepted by a Puzzle. Pre-computed for Pre-built Puzzles; computed on-demand for Custom. (Not: answers, word list)

**Pangram** — A Leksokipos word using all 7 puzzle letters. +7 pt bonus. Every Pre-built Puzzle has ≥1.

**Score** *(Leksokipos)* — Accumulated points: 4-letter words = 1 pt; 5+ = 1 pt/letter; Pangram +7 pt bonus.

**Max Score** — Sum of all Valid Word scores, scaled to 80%, hard-capped at 500 pts. Used for Rank thresholds.

**Rank** — Score milestone: Σπόρος → Βλαστός → Μπουμπούκι → Άνοιγμα → Ανθισμένο → Θαυμαστό → Ευφυΐα → Άνθος. (Not: level, tier)

**Found Words** — Ordered list of Valid Words submitted in the current Session.

**Theme** — Platform-wide light/dark mode. Toggle in Shell header. Persisted in `localStorage["theme-preference"]`. Applied via `.dark` class on `<html>`. Does not follow OS preference.

**Grid Variant** — Leksokipos display style: **Pie Slice** or **Flower**. Persisted in `localStorage["leksokipos-variant"]`. No effect on puzzle data or scoring.

**Word Pool** *(Leksiarxeio)* — Full normalised word list per Length (`words-4.json` … `words-8.json`). Drives both Answer selection and Guess validation.

**Answer** *(Leksiarxeio)* — The secret word. Selected deterministically by date from the Word Pool, or from a Community Puzzle row. (Not: solution)

**Tile** — One letter cell in the Leksiarxeio grid. States: `correct`, `present`, `absent`, `empty`, `pending`.

**Length** *(Leksiarxeio)* — Letters in the Answer. Supported: 4–8. Each Length is a separate Puzzle with its own Session.

**In-game Points** *(Leksiarxeio)* — Per-length score from `scoreLeksiarxeio()`: 6 pts (1 guess) … 1 pt (6 guesses). Display only, not stored.

**Attempt Total** *(Leksiarxeio leaderboard)* — Sum of raw attempts across all 5 Lengths. Lower is better. Failed/unplayed = 7 penalty. API field named `score` for interface compatibility — semantically it is an Attempt Total.

**Category** *(Leksindeseis)* — Label naming a Group of 4 words. Hidden until the Group is solved. (Not: theme, topic)

**Group** *(Leksindeseis)* — Exactly 4 words sharing a Category. A Puzzle has 4 Groups. (Not: category — use only for the label)

**Difficulty** *(Leksindeseis)* — Integer 1–4. 1 = easiest (yellow), 4 = hardest (purple). Display only.

**Selection** *(Leksindeseis)* — Up to 4 highlighted words before a Guess is submitted. Cleared after each Guess.

**Mistakes Remaining** — Wrong Guesses left before game over. Starts at 4.

**Profile** — Named identity linking a DisplayName to a DeviceId in `player_profiles`. Shared across games. (Not: account, login)

**ProfileLinked** — Boolean in PersistenceEnvelope: true when this device has a Profile row. (Not: logged in)

**TransferCode** — 6-char alphanumeric code (no I/1/O/0) for cross-device identity migration. 24h TTL, single-use.

**Leksikastirio** — Community word-court (λεξικό + δικαστήριο). Players vote on Nominations; admins triage them. Also hosts Community Puzzle review tabs in Admin Mode. (Not: word review, suggestions page)

**Nomination** — Proposal to add or remove a word from `words-el.json`. Has a Direction, DeviceId, optional name/note, and status. (Not: suggestion, report)

**Direction** — `"add"` or `"remove"` intent of a Nomination.

**Nomination Status** — `"pending"` → `"accepted"` or `"rejected"`.

**Vote** — Player endorsement of a Nomination, stored as `(nomination_id, device_id)`.

**Admin Mode** — `?admin=<secret>` URL param matching `ADMIN_SECRET`. Reveals Approve/Reject on Nomination Cards and Community Puzzle review tabs. Not linked from nav.

**Flag** — In-game Leksokipos action that opens NominationModal with `direction: "remove"`.

---

## Database tables (9 → 8 after drop)

| Table | Purpose |
|---|---|
| `player_profiles` | `device_uuid` → `display_name`. UNIQUE on `device_uuid`. |
| `transfer_codes` | Single-use 6-char codes, 24h TTL. |
| `game_scores` | Leaderboard scores for all three games (unified). |
| `leksiarxeio_scores` | **Legacy** — data migrated to `game_scores`. **Pending drop.** |
| `game_state` | Serialised Session for cross-device sync (Leksokipos daily puzzles only). Keyed on `(device_uuid, game_id, puzzle_date)`. Blob stores `{ foundWords: string[] }`. Pushed after every valid word (requires ProfileLinked). Pulled on mount when local foundWords is empty (requires ProfileLinked + daily puzzle). |
| `nominations` | Community word proposals. |
| `nomination_votes` | `(nomination_id, device_id)` votes. |
| `community_leksiarxeio_puzzles` | Player-submitted Leksiarxeio puzzles. One row = all 5 lengths. Deleted on consumption. Cols: `id`, `submitter_name`, `data` (jsonb `{"4":…,"8":…}`), `status`, `created_at`. |
| `community_leksindeseis_puzzles` | Player-submitted Leksindeseis puzzles. Deleted on consumption. Cols: `id`, `submitter_name`, `data` (jsonb 4-group array), `status`, `created_at`. |

---

## Flagged ambiguities

**"Score" is overloaded** — Leksokipos Score = accumulated word points (higher = better). Leksiarxeio leaderboard metric = Attempt Total (lower = better). API field is named `score` for interface compatibility only.

**"Valid words" is context-dependent** — In Leksokipos it's the accepted-answer list. In Leksiarxeio it's the guess-validation pool (same file as the Answer pool).

**Leksindeseis Puzzle has no `id`** — Identified by `date` alone. Inconsistent with the other two games; treat `date` as the effective ID.

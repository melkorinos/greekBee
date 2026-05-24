# Greek Word Games Platform

A browser-based platform hosting multiple daily Greek word games. Each game is isolated in logic and persistence but shares a common shell, navigation, and device identity.

## Language

---

### Platform

**Platform**:
The entire application — the shell, navigation, persistence layer, and all hosted games together.
_Avoid_: app, site, product

**Game**:
One of the distinct word-game modes hosted on the platform. Currently: Leksokipos, Leksiarxeio, Leksindeseis.
_Avoid_: module, mode

**Session**:
One continuous play of a Puzzle by a player on a given device. Persists across browser refreshes for as long as the Puzzle hasn't changed. All three games have Sessions; the persisted fields differ (Leksokipos: score + found words; Leksiarxeio: guesses per length; Leksindeseis: solved groups + mistakes remaining).
_Avoid_: run, play, attempt

**DeviceId**:
A stable, anonymous UUID generated once per browser and stored in the persistence envelope. Shared across all games. Never tied to a user account.
_Avoid_: userId, playerId, clientId

**DisplayName**:
The player's chosen name shown on leaderboards. Stored in the persistence envelope. Optional — players can remain anonymous.
_Avoid_: username, handle, alias

**Guess**:
A player's submitted attempt to identify a hidden target. In Leksiarxeio: a single word checked against the Answer. In Leksindeseis: a selection of 4 words checked against a Group. The cardinality differs (1 word vs 4 words) but the concept is the same.
_Avoid_: attempt, try, submission

**Leaderboard**:
A ranked list of Scores for a specific daily Puzzle. Scoped to one puzzle and a 7-day rolling window. Only daily Puzzles have a Leaderboard — Custom Puzzles do not.
_Avoid_: rankings, high scores

---

### Puzzles

**Puzzle**:
A single playable instance of a Game on a given date. Each game has its own concrete type: `LeksokiposPuzzle`, `LeksiarxeioPuzzle`, `LeksindeseisPuzzle`. All Puzzles have a `date` (ISO string); Leksokipos and Leksiarxeio also have a unique `id`.
_Avoid_: board, level, challenge

**Daily Puzzle**:
A Puzzle with a date-scoped ID (format `YYYY-MM-DD` prefix) intended to be the same for all players on a given day.
_Avoid_: today's puzzle (unless informal context)

**Pre-built Puzzle** _(Leksokipos)_:
A Leksokipos Puzzle that was batch-generated offline (via `npm run batch-generate`), passed quality filters (≥1 pangram, vowel centre, ≥2 vowels, ≥2 outer consonants), and stored in `puzzles-el.json`. Every Daily Leksokipos Puzzle is a Pre-built Puzzle. Has a real date-scoped ID and appears on the Leaderboard.
_Avoid_: curated (reserved for hand-authored Leksindeseis puzzles), pre-generated

**Curated Puzzle** _(Leksindeseis)_:
A Leksindeseis Puzzle authored entirely by hand. The Category labels, word groupings, and Difficulty assignments require human editorial judgment and cannot be generated automatically. Stored in `puzzles-connections.json`.
_Avoid_: hand-made, editorial, pre-built (reserved for batch-generated Leksokipos puzzles)

**Custom Puzzle** _(Leksokipos only)_:
A Puzzle constructed from a player-chosen or randomly-generated 7-letter combination. ID format: `custom-{center}-{sortedOuter}`. Never appears on the Leaderboard.
_Avoid_: random puzzle, user puzzle (unless referring specifically to random-generated)

**Puzzle ID**:
The stable, unique string that identifies a Puzzle. Daily: `YYYY-MM-DD-{language}` (Leksokipos) or `YYYY-MM-DD-wordle-{length}` (Leksiarxeio — this format is frozen for localStorage compatibility; renaming it would silently wipe player sessions). Custom: `custom-{center}-{sortedOuter}`.

---

### Leksokipos

**Normalised Word**:
A Greek word that has been processed by `normalizeLetters()`: lowercased, accent marks stripped, and final sigma ς converted to σ. All words stored in game state, all Valid Words lists, all puzzle letter fields, and all URL parameters are Normalised. Raw (un-normalised) input only exists at entry points — keyboard events, URL params — and is normalised immediately on arrival.
_Avoid_: cleaned, processed, sanitised

**Center Letter**:
The mandatory letter that every valid word in a Leksokipos Puzzle must contain. One per Puzzle.
_Avoid_: middle letter, required letter

**Outer Letters**:
The six non-mandatory letters in a Leksokipos Puzzle. Together with the Center Letter they define the full 7-letter set.
_Avoid_: surrounding letters, extra letters

**Valid Words** _(Leksokipos)_:
The complete set of words accepted by a Leksokipos Puzzle. Pre-computed and stored in the Puzzle definition for curated Puzzles; computed on-demand from the full dictionary for Custom Puzzles.
_Avoid_: answers, word list (too generic)

**Pangram**:
A word in a Leksokipos Puzzle that uses all 7 puzzle letters at least once. Awards a 7-point bonus on top of its regular score. Every Pre-built Puzzle is guaranteed to contain at least one.
_Avoid_: full word, bonus word

**Score** _(Leksokipos)_:
The accumulated points a player has earned in the current Session by submitting Valid Words. 4-letter words score 1 pt; 5+-letter words score 1 pt per letter; Pangrams add a 7-pt bonus.
_Avoid_: points, total

**Max Score**:
The ceiling Score for a Puzzle — the sum of scores for all Valid Words, scaled to 80% and hard-capped at 500 pts. Used to compute Rank thresholds.
_Avoid_: total possible, perfect score

**Rank**:
A named milestone in the Leksokipos Scoring ladder. Determined by the player's Score as a percentage of Max Score. Ladder: Σπόρος → Βλαστός → Μπουμπούκι → Άνοιγμα → Ανθισμένο → Θαυμαστό → Ευφυΐα → Άνθος.
_Avoid_: level, tier, badge

**Found Words**:
The ordered list of Valid Words a player has successfully submitted in the current Session.
_Avoid_: guessed words, solved words

**Grid Variant**:
The visual theme of the Leksokipos flower grid. Two options: **Pie Slice** (wedge-shaped SVG sectors arranged radially) and **Flower** (elliptical SVG petals arranged radially). The player's choice is a display preference stored in `localStorage` under the key `leksokipos-variant`. It does not affect puzzle data, Valid Words, Scoring, or Rank.
_Avoid_: skin, theme (use "theme" for the platform-wide light/dark concept, not for grid variants), design

---

### Leksiarxeio

**Word Pool** _(Leksiarxeio)_:
The full set of normalised Greek words at a given Length, used for both drawing the daily Answer and validating player Guesses. One pool per Length (`words-4.json` … `words-8.json`). Answer quality is a known limitation — the same pool drives both purposes.
_Avoid_: word list, dictionary, valid words (too ambiguous across games)

**Answer** _(Leksiarxeio)_:
The secret word the player is trying to guess in a Leksiarxeio Puzzle. Selected deterministically by date from the word list for the active Length.
_Avoid_: solution, target word

**Tile**:
One cell in the Leksiarxeio grid representing a single letter of a submitted Guess. State: `correct` (right letter, right position), `present` (right letter, wrong position), `absent` (not in Answer), `empty`, or `pending` (typed, not yet submitted).
_Avoid_: cell, square, box

**Length** _(Leksiarxeio)_:
The number of letters in the Answer for the active Leksiarxeio Puzzle. Supported: 4, 5, 6, 7, 8. Players can switch Length mid-session; each Length is a separate Puzzle with its own Session.
_Avoid_: word length, size, level

**In-game Points** _(Leksiarxeio)_:
The per-length score returned by `scoreLeksiarxeio()`: 6 pts for 1 guess, 5 for 2, …, 1 for 6. Shown in-game only. Not stored in the database.
_Avoid_: score (ambiguous), result

**Attempt Total** _(Leksiarxeio leaderboard)_:
The daily leaderboard metric: the sum of raw attempts across all 5 Lengths (4–8) for a given day. Lower is better. A failed or unplayed Length counts as 7 (penalty). Stored in the database as `attempts` per row; aggregated server-side. Note: the API response field is currently named `score` for interface compatibility — semantically it is an Attempt Total, not a Score.
_Avoid_: score (use only in code for interface compatibility), points, total

---

### Leksindeseis

**Category**:
The label that names a group of 4 related words in a Leksindeseis Puzzle (e.g. "Greek Gods"). Players do not see the Category name until they solve the Group.
_Avoid_: theme, topic, group name

**Group**:
One set of exactly 4 words that share a Category. A Leksindeseis Puzzle has 4 Groups. Once correctly identified by the player, a Group is "solved."
_Avoid_: category (use only for the label, not the set of words), cluster

**Difficulty** _(Leksindeseis)_:
An integer 1–4 indicating how tricky a Group is. 1 = easiest (conventionally yellow), 4 = hardest (conventionally purple). Used only for display ordering and colour.
_Avoid_: level, tier, color

**Selection** _(Leksindeseis)_:
The set of up to 4 words a player has highlighted before submitting a Guess. Cleared on every Guess.
_Avoid_: chosen words, highlighted words

**Mistakes Remaining**:
The count of wrong Guesses a player has left before the game is lost. Starts at 4.
_Avoid_: lives, errors, chances

---

## Flagged ambiguities

**"Score" is overloaded — resolved**: In Leksokipos, "Score" = accumulated word points (higher = better). In Leksiarxeio, the leaderboard metric is the "Attempt Total" (lower = better) — distinct from the per-length "In-game Points." The API response field is named `score` for interface compatibility but represents an Attempt Total. Never call the Leksiarxeio leaderboard metric "Score" in prose or UI copy.

**"Valid words" is context-dependent**: In Leksokipos, `validWords` is the accepted-answer list for a Puzzle. In Leksiarxeio, "valid words" (uncapitalised) means the words the player is allowed to guess — the same list that also contains the Answer pool. These overlap but are different concepts.

**"Puzzle" for Leksindeseis has no `id`**: `LeksindeseisPuzzle` is identified by `date` alone (no explicit `id` field). This is inconsistent with Leksokipos and Leksiarxeio. Treat `date` as the effective ID for Leksindeseis.

---

## Example dialogue

> **Player**: "I got a pangram but my rank didn't change."
> **Dev**: "Check the Score — a Pangram gives a 7-pt bonus, but the Rank threshold depends on Max Score. If Max Score is 500 pts and you're already at Θαυμαστό (42%), one word won't push you to the next bracket."

> **Dev**: "Should Custom Puzzles ever appear on the Leaderboard?"
> **Maintainer**: "No — only Daily Puzzles have a Leaderboard. Custom Puzzle IDs don't follow the date format, so the API route rejects them."

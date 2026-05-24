# Word suggestion review pipeline

Status: ready-for-agent

## What to build

Players can submit word suggestions via the FeedbackMessage component (Leksokipos only today). Suggestions land in the Supabase `word_suggestions` table but there is no tooling to review, approve, or integrate them. This slice delivers a Node.js CLI script and a small route fix.

### Part 1 — Route fix: capture game_id

`POST /api/suggest-word` currently stores `word`, `player_name`, `note`, `device_id` but no `game_id`. Add an optional `game_id` field to the request payload and the `word_suggestions` table (column default `"leksokipos"` for backwards compatibility). Update the FeedbackMessage → SuggestWordModal flow to pass `game_id`.

### Part 2 — Review CLI (`scripts/review-suggestions.mjs`)

Interactive Node.js script (no new npm dependencies beyond the existing Supabase client) that:

1. Reads all unreviewed rows from `word_suggestions` (add a `reviewed_at` nullable timestamptz column to track this).
2. Prints each suggestion with word, player name, note, game, and submission date.
3. Prompts: `[a]ccept / [r]eject / [s]kip`.
4. **Accept**: runs the word through `normalizeLetters` (import from `src/games/leksokipos/lib/normalize.ts`), confirms it is not already in the target file, appends it to `src/data/words-el.json` (for Leksokipos coverage) and — if a `--length=N` flag is passed — also to `src/data/leksiarxeio/words-N.json`. Marks the row `reviewed_at = now()`.
5. **Reject**: marks `reviewed_at = now()` without touching any data files.
6. **Skip**: leaves `reviewed_at` null, moves to the next row.

The script reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role needed to bypass RLS for the admin read + update). Document both env vars in README.

## Acceptance criteria

- [ ] `word_suggestions` table has `game_id` (text, default `"leksokipos"`) and `reviewed_at` (timestamptz, nullable) columns — SQL migration provided in the issue or in the script
- [ ] `POST /api/suggest-word` accepts and stores optional `game_id`
- [ ] `scripts/review-suggestions.mjs --help` prints usage
- [ ] Accept path: word is normalised, deduplicated, and appended to the correct file(s)
- [ ] Reject path: row marked reviewed, no file changes
- [ ] Script exits cleanly when no unreviewed rows remain
- [ ] README documents `SUPABASE_SERVICE_ROLE_KEY` and how to run the script

## Blocked by

None — can start immediately.

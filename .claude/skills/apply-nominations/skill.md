# /apply-nominations

Apply admin-reviewed Leksikastirio nominations to the local dataset, verify the result, and hand back a diff summary for the developer to commit and deploy.

## What this skill does

1. Run `npm run apply-nominations:dry` — show what would change (word lists **and** affected pre-built puzzles), nothing written
2. Ask the developer to confirm before writing anything
3. Run `npm run apply-nominations` — patch `words-el.json`, any affected `leksiarxeio/words-{N}.json`, and re-sync `puzzles-el.json`
4. **Propose derived words** — generate morphological relatives of the accepted adds (verb paradigms, adjective declensions, noun plurals/cases), normalise + dedupe against `words-el.json`, and write a **review list** under `.claude/aiHelper/nominations/`. Present it and wait for the developer to prune.
5. **Inject approved proposals** — run `npm run apply-proposed -- --file <approved-list>` to add the survivors to the dataset (same word-list + puzzle re-sync path as step 3, **no DB writes**).
6. Run a representative test batch (the full suite OOMs in memory-tight environments — see Notes) — must pass
7. Run `npx eslint .` — zero errors
8. Print a `git diff --stat` of the changed data files
9. Stop — developer commits and deploys manually

## What gets written

- **`src/data/words-el.json`** — master dictionary (all accepted add/remove)
- **`src/data/leksiarxeio/words-{N}.json`** — for accepted words of length 4–8
- **`src/data/leksokipos/puzzles-el.json`** — embedded `validWords` of affected Pre-built Puzzles are re-synced so removed words stop scoring and added words start scoring (via `scripts/lib/resync-puzzles.mjs`)

Nominations act by (direction × status):

| | accepted | rejected |
|---|---|---|
| **add** | word added to dictionary + leksiarxeio + puzzle re-sync | no change (hidden from UI, row retained) |
| **remove** | word deleted from dictionary + leksiarxeio + puzzle re-sync | no change (hidden from UI, row retained) |

Rejected rows are **reported, never deleted** — they are the source of the "already rejected" warning shown to a player who re-proposes the same word.

## Proposed (derived) words

After the DB nominations are applied, the accepted **adds** are used as seeds to propose morphological relatives the developer probably also wants — the classic case is an accepted verb whose whole conjugation paradigm is still missing, but it also covers adjective declensions and noun plurals/cases.

- **Generation is agent-driven** (Greek morphology) — there is no inflection library and none may be installed. The agent lists candidates per seed with a confidence flag (✅ high · ⚠️ check · ❓ likely wrong).
- **Filtering is script-driven** — candidates are normalised (lowercase, strip accents, `ς → σ`) and deduped against `words-el.json`; only genuinely-new words reach the review list.
- **The developer prunes** the list. Only survivors are injected — nothing here is auto-added, and nothing touches the DB (these are not nominations).
- Indeclinable foreign borrowings (`κοαλα`, `τοφου`, `ντονερ` …) yield no candidates — that's expected.

`npm run apply-proposed -- --file <path>` (or `apply-proposed:dry`) reads a `#`-commented, whitespace-separated word list and writes the same three data files as the main apply, re-syncing puzzles for the added words. Add-only — no removes.

## Word routing (for reference)

- `len ≤ 3` → `src/data/words-el.json` only
- `len 4–8` → `src/data/words-el.json` **and** `src/data/leksiarxeio/words-{N}.json`
- `direction: remove` → cascades to all files the word appears in

## Pre-requisites

Env vars (the npm script loads a gitignored `.env` or `.env.local` automatically via `--env-file-if-exists`; or export them in the shell):

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If they are missing the script exits with a clear message and writes nothing.

## Steps

```
STEP 1 — dry run
Run: npm run apply-nominations:dry
Show the output (added / removed / skipped + "Re-sync: N puzzle(s) affected").
Ask: "Proceed with applying these changes? (yes/no)"
If no → stop.

STEP 2 — apply
Run: npm run apply-nominations
Show the output.

STEP 3 — propose derived words
From the accepted ADD words in step 1/2, generate morphological relatives
(verb paradigms, adjective declensions, noun plurals/cases). Normalise + dedupe
against words-el.json (a throwaway node script with a Set is enough), then write
a review list to .claude/aiHelper/nominations/proposed-words-<date>.md with a
confidence flag per candidate (✅ / ⚠️ / ❓).
Present it and ask the developer which to keep. Do NOT inject unreviewed.

STEP 4 — inject approved proposals
Put the approved words in a #-commented list, e.g.
  .claude/aiHelper/nominations/approved-<date>.txt
Preview:  npm run apply-proposed:dry -- --file <list>
Apply:    npm run apply-proposed     -- --file <list>
(Add-only, no DB writes; re-syncs puzzles for the added words.)
If the developer approved nothing, skip this step.

STEP 5 — test
Run a representative batch, e.g.:
  npx vitest run src/test/scripts src/test/leksokipos src/test/leksikastirio src/test/shared/nominationModal.test.tsx
If any test fails → show failures, stop. Do NOT commit.

STEP 6 — lint
Run: npx eslint .
If any error → show errors, stop. Do NOT commit.

STEP 7 — diff summary
Run: git diff --stat src/data/
Show the summary so the developer can see exactly what changed.

STEP 8 — hand off
Print:
"✓ Nominations applied + approved derived words injected (words + puzzles re-synced). Files changed above. Next step: review the diff, then git add + commit + deploy."
```

## Notes

- **The script never builds, commits, or deploys** — it only reads the DB and writes local JSON. Review the git diff, then build/commit/deploy yourself.
- **One-off full puzzle rebuild:** the re-sync only covers words touched in this run. If the dictionary is ever bulk-reimported, the pre-built puzzles' `validWords` can drift — recompute all of them from `words-el.json` rather than relying on per-run deltas. (Not currently needed; data verified consistent.)
- `npm run test -- --run` (the full suite) can be OOM-killed in memory-constrained codespaces because tests static-import the 812k-word lists. Run a targeted batch there; run the full suite on a roomier machine to reconfirm the baseline.

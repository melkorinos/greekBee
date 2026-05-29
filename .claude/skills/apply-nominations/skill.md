# /apply-nominations

Apply accepted Leksikastirio nominations to all word-list files, verify the result, and hand back a diff summary for the developer to commit and deploy.

## What this skill does

1. Run `node scripts/apply-nominations.mjs --dry-run` — show what would change
2. Ask the developer to confirm before writing anything
3. Run `node scripts/apply-nominations.mjs` — patch `words-el.json` and any `leksiarxeio/words-{N}.json` files affected
4. Run `npm run test -- --run` — all tests must pass
5. Run `npx eslint .` — zero errors
6. Print a `git diff --stat` of the changed JSON files
7. Stop — developer commits and deploys manually

## Word routing (for reference)

- `len ≤ 3` → `src/data/words-el.json` only
- `len 4–8` → `src/data/words-el.json` **and** `src/data/leksiarxeio/words-{N}.json`
- `direction: remove` → cascades to all files the word appears in

## Pre-requisites

Env vars must be set (`.env.local` or shell):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Steps

```
STEP 1 — dry run
Run: node scripts/apply-nominations.mjs --dry-run
Show the output to the developer.
Ask: "Proceed with applying these changes? (yes/no)"
If no → stop.

STEP 2 — apply
Run: node scripts/apply-nominations.mjs
Show the output.

STEP 3 — test
Run: npm run test -- --run
If any test fails → show failures, stop. Do NOT commit.

STEP 4 — lint
Run: npx eslint .
If any error → show errors, stop. Do NOT commit.

STEP 5 — diff summary
Run: git diff --stat src/data/
Show the summary so the developer can see exactly what changed.

STEP 6 — hand off
Print:
"✓ Nominations applied. Files changed above. Next step: review the diff, then git add + commit + deploy."
```

## Notes

- Pre-built Leksokipos puzzles (`src/data/leksokipos/puzzles-el.json`) are NOT updated — they are static snapshots. New words appear in Custom Leksokipos puzzles immediately after deploy.
- Future revisit: once on a paid Vercel tier, consider dropping `runtime = "edge"` from the VresTinFrasi route and importing `words-el.json` directly instead of per-length files.

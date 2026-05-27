# Strip validWords from puzzles-el.json to reduce file size

Status: needs-triage

`src/data/leksokipos/puzzles-el.json` is ~5 MB because every pre-built puzzle stores its full `validWords` array inline. Custom puzzles already compute `validWords` dynamically at request time via `buildCustomPuzzle` + `words-el.json`. The same approach can be applied to pre-built puzzles, shrinking the file to ~50 KB.

## Why this matters

The full 5 MB JSON is loaded at build time on every cold start. Stripping `validWords` from pre-built puzzles would reduce bundle parse time significantly and improve Vercel Fluid Active CPU usage (a tracked cost constraint — see `reflections.md`).

## Proposed approach

1. Strip `validWords` from all entries in `puzzles-el.json`, storing only `centerLetter`, `outerLetters`, and `date`.
2. Update `getPuzzleForDate` (and related loaders in `src/data/leksokipos/index.ts`) to call `computeValidWords(centerLetter, outerLetters, allWords)` at request time, same as `buildCustomPuzzle`.
3. Add a `revalidate` cache so the computation only runs once per puzzle per instance lifetime.

## Open questions

- Does this affect build-time static generation? The server component currently resolves the puzzle at request time already, so likely no impact.
- Needs a benchmark confirming cold-start improvement is measurable before committing.

## Comments

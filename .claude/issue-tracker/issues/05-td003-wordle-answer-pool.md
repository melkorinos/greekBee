# TD-003 — Leksiarxeio answer pool quality (lengths 4, 6, 7, 8)

Status: ready-for-agent

`words-{4..8}.json` uses a single normalised dictionary for both valid guesses and daily answers. This means daily answers can be obscure or archaic Greek words.

**Partially resolved**: `answers-5.json` was manually curated for length 5. Lengths 4, 6, 7, and 8 still draw answers from the full uncurated word list.

## Affected files

- `src/data/leksiarxeio/words-4.json` — no curated answers file
- `src/data/leksiarxeio/words-6.json` — no curated answers file
- `src/data/leksiarxeio/words-7.json` — no curated answers file
- `src/data/leksiarxeio/words-8.json` — no curated answers file
- `src/data/leksiarxeio/index.ts` — falls back to full word list when no answers file exists

## Acceptance criteria

- Separate `answers-{4,6,7,8}.json` files created, each filtered against a high-frequency lemma list (or manually curated).
- `src/data/leksiarxeio/index.ts` updated to use `answers-N.json` as the answer pool when it exists, falling back to `words-N.json` only for valid-guess validation.
- Existing tests still pass; add a test asserting `getAnswerPool(N)` returns a subset of `getValidWords(N)`.

## Comments

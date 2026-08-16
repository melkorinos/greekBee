# `leksodromia/board.test.tsx` times out under full-suite load

**Deferred:** it is a test-harness timing failure, not a product defect, and the file passes cleanly
on its own. Fixing it properly means understanding why these particular waits are slow, which is
worth a session rather than a patch at the end of an unrelated one.
**Revisit when:** it fails twice in a row on a machine that is otherwise idle, or when it fails in
**CI** — CI is the case that actually costs something, and it has not been seen there yet.

## What happens

`npm run test -- --run` intermittently fails one or two tests in
`src/test/leksodromia/board.test.tsx` with `Test timed out in 5000ms`. Observed on 2026-08-17:

- **finishing the round shows a recap of all 10 words**
- **skips never re-post (score unchanged); the round still ends after the second pass**

The same file run alone: **13 passed in 11.3 s**. In the full suite the file's own duration roughly
doubles to ~20 s, which is what pushes individual 5 s waits over.

## Why it is filed rather than fixed

**It is not caused by the branch it was found on.** The share-preview work added
`shareMetadata.test.ts`, which renders three PNGs through satori and sharp, and that was the obvious
suspect — native image encoding is exactly the kind of thing that starves a worker pool. It was
tested rather than assumed, in two steps:

1. Running the suite with `--exclude "**/shareMetadata.test.ts"` was green.
2. **`git stash push` of only the session's own paths, then a full run at `HEAD`, reproduced the
   failure anyway** (one test rather than two). `HEAD` at the time — `4dff2a0` — already contained
   the render tests and had gone green twice earlier the same session.

So the render tests are not the cause; they are one more load on a file that was already marginal.
Step 1 alone would have convicted the wrong thing, which is the reason step 2 exists.

Capping libvips with `VIPS_CONCURRENCY=1` was tried and **did not help**, so the mechanism is not
simply sharp's thread pool. That line was removed rather than left in place — a comment claiming to
fix something it does not is worse than no comment.

## What the fix probably is

Not "raise the timeout". These waits are 5 s for a reason and lengthening them makes a genuine
regression slower to catch. Read the two tests first: both drive a **ten-word round to completion**
through the decay clock, so the likely cause is real elapsed time in a loop rather than a hang, and
the honest fix is fake timers or fewer words. Confirm against the file before choosing.

## Notes

- The failure count moves between runs (1, then 2, then 1), which is the signature of a timing
  margin rather than a broken assertion. A run that fails a *different* test in this file is the
  same issue, not a new one.
- Distinguish it from the two flakes already documented elsewhere: the **e2e** stale-Turbopack-chunk
  flake (`memory.md`, fixed by clearing `.next`) and the intermittent `game_state` DELETE failure
  (mechanism in a comment above `wipeSentinelRows`). This one is vitest, single-file, and load-bound.

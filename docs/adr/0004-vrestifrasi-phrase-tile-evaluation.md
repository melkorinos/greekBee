# ADR 0004 — Vres Tin Frasi uses four tile states with purple for cross-word misplacement

**Status**: Accepted

## Context

Vres Tin Frasi is a Wordle-style game where the answer is a 3–4 word Greek phrase and the player guesses a matching phrase. Standard Wordle has three feedback states per tile: `correct` (green), `present` (yellow), `absent` (grey). In a multi-word phrase there is a new information class: a letter that exists in the answer phrase but in a *different word* than the one the player guessed it in. The question was whether to collapse this into `present` (yellow) or give it a distinct state.

Two realistic options:

- **A (three states)**: Treat cross-word misplacement the same as within-word wrong-position — both map to `present` (yellow). Simpler, familiar to Wordle players.
- **B (four states)**: Add `misplaced-word` (purple) for letters that are in the phrase but in a different word. Yellow (`present`) is reserved for letters in the right word but wrong position.

## Decision

Option B. Four tile states: `correct` (green), `present` (yellow), `misplaced-word` (purple), `absent` (grey). Keyboard priority: `correct` > `present` > `misplaced-word` > `absent`.

Evaluation algorithm (two-pass, per Leksiarxeio):
1. Pass 1 — mark exact matches (`correct`) per word, build per-word remaining-letter frequency maps.
2. Pass 2 — for each non-correct guessed letter: if the letter is in the *same word's* remaining pool → `present`; else if it is in *any other word's* remaining pool → `misplaced-word`; otherwise → `absent`.

## Reasons

- Option A loses information the multi-word format uniquely provides. Knowing a letter is in a different word is actionable; conflating it with yellow removes a strategic signal the player earned.
- The how-to-play modal explains all four states with worked examples, so the extra state does not increase confusion for new players.
- The keyboard priority (`present` > `misplaced-word`) reflects information value: yellow tells the player which word a letter belongs to; purple only tells them it exists somewhere else.

## Consequences

- `evaluatePhraseGuess()` must implement the two-pass cross-word algorithm rather than re-using `evaluateGuess()` directly.
- `buildPhraseLetterStateMap()` needs to handle the four-state priority order.
- Tile and keyboard components need a `misplaced-word` colour token (purple) added to the Tailwind config.
- The how-to-play modal is mandatory UX — without it, purple will confuse returning Leksiarxeio players who expect only three states.

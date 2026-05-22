# Mobile physical keyboard gap

Status: ready-for-agent

`window.keydown` in Wordle GR works on desktop only. The on-screen `Keyboard` component handles mobile input, but there is no test verifying the on-screen keyboard dispatches correctly end-to-end.

## Affected file

`src/games/wordle/hooks/useWordleState.ts` — `keydown` listener

## Acceptance criteria

- A component test (RTL) verifies that clicking an on-screen key letter dispatches `ADD_LETTER` and updates the guess row.
- A test verifies that clicking the on-screen backspace dispatches `DELETE_LETTER`.
- A test verifies that clicking the on-screen enter dispatches `SUBMIT_GUESS`.

## Comments

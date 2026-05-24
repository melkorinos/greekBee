# Leksiarxeio on-screen keyboard dispatch not tested

Status: ready-for-agent

The physical `window.keydown` listener in `useLeksiarxeioState` works on desktop only. On mobile, players use the on-screen `Keyboard` component (`src/components/leksiarxeio/Keyboard.tsx`), which exposes `onLetter`, `onDelete`, and `onEnter` callback props. These callbacks are wired in `LeksiarxeioBoard` but there are no tests verifying that clicking an on-screen key reaches the reducer and updates visible game state end-to-end.

Existing keyboard tests (`src/test/leksiarxeio/theme.test.tsx`, `guessGrid.test.tsx`) only cover layout and CSS classes — not interaction.

## Affected files

- `src/components/leksiarxeio/Keyboard.tsx` — `onLetter`, `onDelete`, `onEnter` props
- `src/components/leksiarxeio/LeksiarxeioBoard.tsx` — wires callbacks into `useLeksiarxeioState`

## Acceptance criteria

- [ ] RTL test: clicking a letter key calls `onLetter` with the correct normalised character and the guess row updates to show the letter
- [ ] RTL test: clicking the on-screen backspace (⌫) calls `onDelete` and the last letter is removed from the guess row
- [ ] RTL test: clicking the on-screen enter (↵) with a full valid guess calls `onEnter` and the row transitions out of `pending` state
- [ ] All three tests render `LeksiarxeioBoard` (or `Keyboard` in isolation with mock callbacks) — not just the keyboard layout

## Comments

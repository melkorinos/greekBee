// connectionsReducer — pure reducer for Connections game state.
// Zero React imports. Fully unit-testable.

import type {
  ConnectionGroup,
  ConnectionsAction,
  ConnectionsState,
} from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Check if a sorted word array matches a group's words exactly. */
function matchesGroup(selection: string[], group: ConnectionGroup): boolean {
  const sel = [...selection].sort();
  const grp = [...group.words].sort();
  return sel.every((w, i) => w === grp[i]) && sel.length === grp.length;
}

/** Is this selection exactly one word away from a group? */
function isOneAway(selection: string[], group: ConnectionGroup): boolean {
  const overlap = selection.filter((w) => group.words.includes(w));
  return overlap.length === 3;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

export function connectionsReducer(
  state: ConnectionsState,
  action: ConnectionsAction,
): ConnectionsState {
  if (state.status !== "playing" && action.type !== "CLEAR_FEEDBACK") {
    return state;
  }

  switch (action.type) {
    case "SELECT_WORD": {
      const { word } = action;
      const { currentSelection } = state;

      // Deselect if already selected
      if (currentSelection.includes(word)) {
        return {
          ...state,
          currentSelection: currentSelection.filter((w) => w !== word),
        };
      }

      // Max 4 selected — ignore extra taps
      if (currentSelection.length >= 4) return state;

      return {
        ...state,
        currentSelection: [...currentSelection, word],
      };
    }

    case "SUBMIT_GUESS": {
      const { currentSelection, puzzle, solvedGroups, mistakesRemaining } = state;

      // Must have exactly 4 selected
      if (currentSelection.length !== 4) return state;

      // Check if already guessed this combination
      const selKey = [...currentSelection].sort().join(",");
      const alreadyGuessed = state.guessHistory.some(
        (g) => [...g].sort().join(",") === selKey,
      );
      if (alreadyGuessed) {
        return { ...state, lastFeedback: "Το έχεις ήδη δοκιμάσει!" };
      }

      // Find the matching group in unsolved groups
      const unsolvedGroups = puzzle.groups.filter(
        (g) => !solvedGroups.includes(g),
      );
      const match = unsolvedGroups.find((g) => matchesGroup(currentSelection, g));

      if (match) {
        const newSolvedGroups = [...solvedGroups, match];
        const won = newSolvedGroups.length === puzzle.groups.length;
        return {
          ...state,
          solvedGroups:     newSolvedGroups,
          currentSelection: [],
          guessHistory:     [...state.guessHistory, currentSelection],
          status:           won ? "won" : "playing",
          lastFeedback:     won ? "Μπράβο! Τα βρήκες όλα! 🎉" : `✅ ${match.category}`,
        };
      }

      // Wrong guess — check one-away
      const oneAway = unsolvedGroups.some((g) => isOneAway(currentSelection, g));
      const newMistakes = mistakesRemaining - 1;

      if (newMistakes <= 0) {
        return {
          ...state,
          mistakesRemaining: 0,
          guessHistory:     [...state.guessHistory, currentSelection],
          currentSelection: [],
          status:           "lost",
          lastFeedback:     "Δεν τα κατάφερες αυτή τη φορά 😔",
        };
      }

      return {
        ...state,
        mistakesRemaining: newMistakes,
        guessHistory:     [...state.guessHistory, currentSelection],
        currentSelection: [],
        lastFeedback:     oneAway ? "Μία παραπάνω! 🟡" : "Λάθος συνδυασμός",
      };
    }

    case "SHUFFLE": {
      // Shuffle the words in unsolved groups
      return { ...state };
      // (actual shuffle is handled in the hook layer via re-order of display words)
    }

    case "CLEAR_FEEDBACK": {
      return { ...state, lastFeedback: null };
    }

    default:
      return state;
  }
}

// topothesiesReducer.ts — the single state-machine seam (pure, no React).
// Two stages: Stage 1 guesses the regional unit from its silhouette (4 tries),
// Stage 2 guesses that unit's capital (3 tries, bonus). A guess is only consumed
// when it is a VALID, autocomplete-resolvable guess — typos and non-candidate
// capitals no-op so the player is never penalised for input noise. A failed
// shape stage still enters the capital stage (the educational path: reveal the
// unit, let the player still earn the capital bonus — handoff 02 open detail,
// default = yes). All flags are derived from the guess history, so RESTORE_STATE
// just replays a saved history through the same derivation.

import { TOPOTHESIES } from "@/config/gameRules";
import { normalizeLetters } from "@/lib/normalize";

import type {
  CapitalGuessRecord,
  ShapeGuessRecord,
  TopothesiesAnswer,
  TopothesiesState,
} from "../types";

import { evaluateCapitalGuess, evaluateShapeGuess, resolveAnswerId } from "./evaluateGuess";

// ─── Action types ─────────────────────────────────────────────────────────────

export type TopothesiesAction =
  | { type: "GUESS_SHAPE"; text: string }
  | { type: "GUESS_CAPITAL"; text: string }
  | { type: "RESTORE_STATE"; shapeGuesses: ShapeGuessRecord[]; capitalGuesses: CapitalGuessRecord[] };

// ─── Flag derivation ──────────────────────────────────────────────────────────

/** Recompute every stage flag + the current stage purely from the histories. */
function derive(
  shapeGuesses: ShapeGuessRecord[],
  capitalGuesses: CapitalGuessRecord[],
): Pick<
  TopothesiesState,
  "stage" | "shapeSolved" | "shapeFailed" | "capitalSolved" | "capitalFailed"
> {
  const shapeSolved = shapeGuesses.some((g) => g.correct);
  const shapeFailed = !shapeSolved && shapeGuesses.length >= TOPOTHESIES.SHAPE_GUESSES;
  const shapeDone = shapeSolved || shapeFailed;

  const capitalSolved = capitalGuesses.some((g) => g.correct);
  const capitalFailed = !capitalSolved && capitalGuesses.length >= TOPOTHESIES.CAPITAL_GUESSES;
  const capitalDone = capitalSolved || capitalFailed;

  const stage = !shapeDone ? "shape" : !capitalDone ? "capital" : "finished";
  return { stage, shapeSolved, shapeFailed, capitalSolved, capitalFailed };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function topothesiesReducer(
  state: TopothesiesState,
  action: TopothesiesAction,
): TopothesiesState {
  switch (action.type) {

    case "GUESS_SHAPE": {
      if (state.stage !== "shape") return state;
      const guessId = resolveAnswerId(action.text, state.answers);
      if (guessId === null) return state; // typo / not a unit — no guess consumed
      const { correct, hint } = evaluateShapeGuess(guessId, state.target, state.answers, state.maxKm);
      const shapeGuesses = [...state.shapeGuesses, { guessId, correct, hint }];
      return { ...state, shapeGuesses, ...derive(shapeGuesses, state.capitalGuesses) };
    }

    case "GUESS_CAPITAL": {
      if (state.stage !== "capital") return state;
      const { correct, hint } = evaluateCapitalGuess(action.text, state.target, state.answers, state.maxKm);
      // Consume only a valid guess: the right capital, or a wrong-but-known one
      // (which carries a hint). An unknown capital (no match, no hint) no-ops.
      if (!correct && hint === null) return state;
      const capitalGuesses = [
        ...state.capitalGuesses,
        { guessNormalized: normalizeLetters(action.text), correct, hint },
      ];
      return { ...state, capitalGuesses, ...derive(state.shapeGuesses, capitalGuesses) };
    }

    case "RESTORE_STATE": {
      return {
        ...state,
        shapeGuesses: action.shapeGuesses,
        capitalGuesses: action.capitalGuesses,
        ...derive(action.shapeGuesses, action.capitalGuesses),
      };
    }

    default:
      return state;
  }
}

// ─── Initial state factory ────────────────────────────────────────────────────

/**
 * Fresh round for `target`, drawn from the `answers` candidate set, with the
 * proximity scale `maxKm` (the dataset's max pairwise centroid distance —
 * injected so logic never depends on the placeholder config value).
 */
export function makeInitialTopothesiesState(
  target: TopothesiesAnswer,
  answers: TopothesiesAnswer[],
  maxKm: number,
): TopothesiesState {
  return {
    puzzleId: target.id,
    target,
    answers,
    maxKm,
    stage: "shape",
    shapeGuesses: [],
    capitalGuesses: [],
    shapeSolved: false,
    shapeFailed: false,
    capitalSolved: false,
    capitalFailed: false,
  };
}

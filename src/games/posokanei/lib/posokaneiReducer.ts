// posokaneiReducer.ts — the single state-machine seam (pure, no React).
// One stage: guess the price until you land within the band or run out of
// guesses. A guess is only CONSUMED when it is a valid positive number — empty
// or non-positive input no-ops so the player is never penalised for input noise
// (mirrors topothesies' "invalid guess no-ops"). All flags are derived from the
// guess history + `gaveUp`, so RESTORE_STATE just replays a saved history.

import { POSOKANEI } from "@/config/gameRules";

import type { PosokaneiGuessRecord, PosokaneiPuzzle, PosokaneiState } from "../types";

import { evaluatePriceGuess } from "./evaluateGuess";

// ─── Action types ─────────────────────────────────────────────────────────────

export type PosokaneiAction =
  | { type: "GUESS"; value: number }
  | { type: "GIVE_UP" }
  | { type: "RESTORE_STATE"; guesses: PosokaneiGuessRecord[]; gaveUp?: boolean };

// ─── Flag derivation ──────────────────────────────────────────────────────────

/** Recompute stage + solved/failed purely from the history and `gaveUp`. */
function derive(
  guesses: PosokaneiGuessRecord[],
  gaveUp: boolean,
): Pick<PosokaneiState, "stage" | "solved" | "failed"> {
  const solved = guesses.some((g) => g.correct);
  const failed = !solved && (gaveUp || guesses.length >= POSOKANEI.MAX_GUESSES);
  const stage = solved || failed ? "finished" : "guessing";
  return { stage, solved, failed };
}

/** True for input we accept as a real guess (a finite, positive euro amount). */
function isValidGuess(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function posokaneiReducer(state: PosokaneiState, action: PosokaneiAction): PosokaneiState {
  switch (action.type) {
    case "GUESS": {
      if (state.stage !== "guessing") return state;
      if (!isValidGuess(action.value)) return state; // input noise — no guess consumed
      const { correct, direction, proximityPct } = evaluatePriceGuess(
        action.value,
        state.target.price,
        state.target.band,
      );
      const guesses = [...state.guesses, { value: action.value, correct, direction, proximityPct }];
      return { ...state, guesses, ...derive(guesses, state.gaveUp) };
    }

    case "GIVE_UP": {
      if (state.stage === "finished") return state;
      return { ...state, gaveUp: true, ...derive(state.guesses, true) };
    }

    case "RESTORE_STATE": {
      const gaveUp = action.gaveUp ?? false;
      return { ...state, guesses: action.guesses, gaveUp, ...derive(action.guesses, gaveUp) };
    }

    default:
      return state;
  }
}

// ─── Initial state factory ────────────────────────────────────────────────────

/** A fresh round for `target`. */
export function makeInitialPosokaneiState(target: PosokaneiPuzzle): PosokaneiState {
  return {
    puzzleId: target.date,
    target,
    guesses: [],
    stage: "guessing",
    solved: false,
    failed: false,
    gaveUp: false,
  };
}

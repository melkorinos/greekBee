// logopaignioReducer.ts — the single state-machine seam (pure, no React).
// One stage: guess the brand until a guess matches or you run out of guesses. A
// guess is only CONSUMED when it normalises to something non-empty — blank or
// whitespace-only input no-ops so the player is never penalised for input noise
// (mirrors posokanei/topothesies). All flags are derived from the guess history
// + `gaveUp`, so RESTORE_STATE just replays a saved history.

import { LOGOPAIGNIO } from "@/config/gameRules";

import type { LogopaignioGuessRecord, LogopaignioPuzzle, LogopaignioState } from "../types";

import { evaluateGuess } from "./evaluateGuess";

// ─── Action types ─────────────────────────────────────────────────────────────

export type LogopaignioAction =
  | { type: "GUESS"; input: string }
  | { type: "GIVE_UP" }
  | { type: "RESTORE_STATE"; guesses: LogopaignioGuessRecord[]; gaveUp?: boolean };

// ─── Flag derivation ──────────────────────────────────────────────────────────

/** Recompute stage + solved/failed purely from the history and `gaveUp`. */
function derive(
  guesses: LogopaignioGuessRecord[],
  gaveUp: boolean,
): Pick<LogopaignioState, "stage" | "solved" | "failed"> {
  const solved = guesses.some((g) => g.correct);
  const failed = !solved && (gaveUp || guesses.length >= LOGOPAIGNIO.MAX_GUESSES);
  const stage = solved || failed ? "finished" : "guessing";
  return { stage, solved, failed };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function logopaignioReducer(state: LogopaignioState, action: LogopaignioAction): LogopaignioState {
  switch (action.type) {
    case "GUESS": {
      if (state.stage !== "guessing") return state;
      const { correct, normalizedInput } = evaluateGuess(action.input, state.target);
      if (normalizedInput.length === 0) return state; // blank/whitespace — no guess consumed
      const guesses = [...state.guesses, { input: action.input, correct }];
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
export function makeInitialLogopaignioState(target: LogopaignioPuzzle): LogopaignioState {
  return {
    puzzleId: target.id,
    target,
    guesses: [],
    stage: "guessing",
    solved: false,
    failed: false,
    gaveUp: false,
  };
}

// Leksoplegma — pure reducer (no side effects, no React).
// Both control schemes (pointer-drag tracing and tap-to-build) submit through
// the same TRACE_WORD action carrying a tile-index sequence; the reducer
// validates edge-adjacency itself via the graph lib, so it stays UI-agnostic.
// Collapse is derived state: live tiles/edges follow from paths + foundRequired.

import type { LeksoplegmaPuzzle, LeksoplegmaState } from "../types";

import { isTraceValid, liveEdges } from "./graph";
import { computeScore } from "./scoring";

// ─── Action types ─────────────────────────────────────────────────────────────

export type LeksoplegmaAction =
  | { type: "TRACE_WORD"; trace: number[] }
  | { type: "USE_HINT" }
  | { type: "RESTORE_STATE"; foundRequired: string[]; hintsUsed: string[] };

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Round score so far — posted to the leaderboard once, at completion. */
export function getRoundScore(state: LeksoplegmaState): number {
  return computeScore(state.foundRequired, state.hintsUsed);
}

/** Start tile + length of each hinted, still-unfound required word. */
export function getActiveHints(state: LeksoplegmaState): { startTile: number; length: number }[] {
  return state.hintsUsed
    .filter((word) => !state.foundRequired.includes(word))
    .map((word) => ({ startTile: state.puzzle.paths[word][0], length: word.length }));
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function leksoplegmaReducer(
  state: LeksoplegmaState,
  action: LeksoplegmaAction,
): LeksoplegmaState {
  if (state.status === "finished" && action.type !== "RESTORE_STATE") return state;

  switch (action.type) {

    case "TRACE_WORD": {
      const { paths } = state.puzzle;
      const live = liveEdges(paths, state.foundRequired);
      if (!isTraceValid(action.trace, live)) return { ...state, wrongTrace: true };

      // A trace walks undirected edges, so it may spell a word either way round.
      // Accept whichever direction hits a still-unfound required word.
      const forward = action.trace.map((i) => state.puzzle.letters[i]).join("");
      const backward = [...forward].reverse().join("");
      const word = [forward, backward].find(
        (w) => w in paths && !state.foundRequired.includes(w),
      );

      if (word !== undefined) {
        const foundRequired = [...state.foundRequired, word];
        const finished = foundRequired.length === Object.keys(paths).length;
        return {
          ...state,
          foundRequired,
          status: finished ? "finished" : "playing",
          wrongTrace: false,
        };
      }

      return { ...state, wrongTrace: true }; // miss or duplicate — no penalty
    }

    case "USE_HINT": {
      const target = Object.keys(state.puzzle.paths).find(
        (word) => !state.foundRequired.includes(word) && !state.hintsUsed.includes(word),
      );
      if (target === undefined) return state;
      return { ...state, hintsUsed: [...state.hintsUsed, target], wrongTrace: false };
    }

    case "RESTORE_STATE": {
      const { paths } = state.puzzle;
      const foundRequired = action.foundRequired.filter((w) => w in paths);
      return {
        ...state,
        foundRequired,
        hintsUsed: action.hintsUsed.filter((w) => w in paths),
        status: foundRequired.length === Object.keys(paths).length ? "finished" : "playing",
        wrongTrace: false,
      };
    }

    default:
      return state;
  }
}

// ─── Initial state factory ────────────────────────────────────────────────────

export function makeInitialLeksoplegmaState(
  puzzleId: string,
  puzzle: LeksoplegmaPuzzle,
): LeksoplegmaState {
  return {
    puzzleId,
    puzzle,
    foundRequired: [],
    hintsUsed: [],
    wrongTrace: false,
    status: "playing",
  };
}

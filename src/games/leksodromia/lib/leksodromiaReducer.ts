// Leksodromia — pure reducer (no side effects, no React).
// All game state transitions live here. The reducer never reads Date.now():
// elapsed time arrives as the SUBMIT_WORD / SKIP_WORD payload from the clock
// hook, so time handling stays testable and refresh-proof.
//
// Input model: `picked` holds indices into the scrambled word (tile rack), so
// duplicate letters stay unambiguous. Hints lock a growing prefix of correct
// tiles (lockedTileIdxs) and clear the free picks — the player rebuilds the
// rest after the revealed prefix.

import { LEKSODROMIA } from "@/config/gameRules";

import type { LeksodromiaState, LeksodromiaWordResult } from "../types";

import { computeWordPoints } from "./scoring";

// ─── Action types ─────────────────────────────────────────────────────────────

export type LeksodromiaAction =
  | { type: "PICK_TILE";     tileIndex: number }
  | { type: "ADD_LETTER";    letter: string }
  | { type: "REMOVE_LETTER" }
  | { type: "SUBMIT_WORD";   elapsedMs: number }
  | { type: "USE_HINT" }
  | { type: "SKIP_WORD";     elapsedMs: number }
  | { type: "RESTORE_STATE"; wordIndex: number; results: LeksodromiaWordResult[]; currentHintsUsed: number };

// ─── Selectors ────────────────────────────────────────────────────────────────

/** The current answer word, or "" when the round is finished. */
function currentWord(state: LeksodromiaState): string {
  return state.words[state.wordIndex] ?? "";
}

/** Letters currently in the answer row: hint-locked prefix + free picks. */
export function getCurrentInput(state: LeksodromiaState): string {
  const scramble = state.scrambles[state.wordIndex] ?? "";
  return [...state.lockedTileIdxs, ...state.picked]
    .map((i) => scramble[i])
    .join("");
}

/** Rack tiles not yet consumed by a hint or a pick, in scramble order. */
export function getAvailableTileIndices(state: LeksodromiaState): number[] {
  const used = new Set([...state.lockedTileIdxs, ...state.picked]);
  const scramble = state.scrambles[state.wordIndex] ?? "";
  return [...scramble].map((_, i) => i).filter((i) => !used.has(i));
}

/** Running round total — the score posted to the leaderboard at round end. */
export function getTotalScore(state: LeksodromiaState): number {
  return state.results.reduce((sum, r) => sum + r.points, 0);
}

// ─── Internals ────────────────────────────────────────────────────────────────

/** Locked prefix for `hintsUsed` hints: one tile per revealed answer letter. */
function lockPrefixTiles(scramble: string, answer: string, hintsUsed: number): number[] {
  const locked: number[] = [];
  for (let pos = 0; pos < hintsUsed; pos++) {
    const letter = answer[pos];
    const idx = [...scramble].findIndex((ch, i) => ch === letter && !locked.includes(i));
    if (idx === -1) break; // scramble/answer mismatch — never happens for a real puzzle
    locked.push(idx);
  }
  return locked;
}

/** Record a result for the current word and advance (or finish the round). */
function advance(state: LeksodromiaState, result: LeksodromiaWordResult): LeksodromiaState {
  const results = [...state.results, result];
  const wordIndex = state.wordIndex + 1;
  return {
    ...state,
    results,
    wordIndex,
    status: wordIndex >= state.words.length ? "finished" : "playing",
    picked: [],
    lockedTileIdxs: [],
    hintsUsed: 0,
    wrongSubmit: false,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function leksodromiaReducer(state: LeksodromiaState, action: LeksodromiaAction): LeksodromiaState {
  if (state.status === "finished" && action.type !== "RESTORE_STATE") return state;

  switch (action.type) {

    case "PICK_TILE": {
      const answer = currentWord(state);
      if (getCurrentInput(state).length >= answer.length) return state;
      const { tileIndex } = action;
      if (state.picked.includes(tileIndex) || state.lockedTileIdxs.includes(tileIndex)) return state;
      if (tileIndex < 0 || tileIndex >= answer.length) return state;
      return { ...state, picked: [...state.picked, tileIndex], wrongSubmit: false };
    }

    case "ADD_LETTER": {
      const scramble = state.scrambles[state.wordIndex] ?? "";
      const tileIndex = getAvailableTileIndices(state)
        .find((i) => scramble[i] === action.letter);
      if (tileIndex === undefined) return state;
      return leksodromiaReducer(state, { type: "PICK_TILE", tileIndex });
    }

    case "REMOVE_LETTER": {
      if (state.picked.length === 0) return state;
      return { ...state, picked: state.picked.slice(0, -1), wrongSubmit: false };
    }

    case "SUBMIT_WORD": {
      const answer = currentWord(state);
      const input = getCurrentInput(state);
      if (input.length < answer.length) return state;
      if (input !== answer) return { ...state, wrongSubmit: true };
      return advance(state, {
        word:      answer,
        status:    "solved",
        elapsedMs: action.elapsedMs,
        hintsUsed: state.hintsUsed,
        points:    computeWordPoints(action.elapsedMs, answer.length as 4 | 5 | 6 | 7 | 8, state.hintsUsed),
      });
    }

    case "USE_HINT": {
      if (state.hintsUsed >= LEKSODROMIA.MAX_HINTS_PER_WORD) return state;
      const hintsUsed = state.hintsUsed + 1;
      return {
        ...state,
        hintsUsed,
        lockedTileIdxs: lockPrefixTiles(state.scrambles[state.wordIndex] ?? "", currentWord(state), hintsUsed),
        picked: [], // free picks may conflict with the revealed prefix — reset
        wrongSubmit: false,
      };
    }

    case "SKIP_WORD": {
      return advance(state, {
        word:      currentWord(state),
        status:    "skipped",
        elapsedMs: action.elapsedMs,
        hintsUsed: state.hintsUsed,
        points:    0,
      });
    }

    case "RESTORE_STATE": {
      const wordIndex = Math.min(action.wordIndex, state.words.length);
      const finished = wordIndex >= state.words.length;
      const answer = state.words[wordIndex] ?? "";
      const scramble = state.scrambles[wordIndex] ?? "";
      const hintsUsed = finished ? 0 : action.currentHintsUsed;
      return {
        ...state,
        wordIndex,
        results: action.results,
        status: finished ? "finished" : "playing",
        hintsUsed,
        lockedTileIdxs: lockPrefixTiles(scramble, answer, hintsUsed),
        picked: [],
        wrongSubmit: false,
      };
    }

    default:
      return state;
  }
}

// ─── Initial state factory ────────────────────────────────────────────────────

export function makeInitialLeksodromiaState(
  puzzleId: string,
  words: string[],
  scrambles: string[],
): LeksodromiaState {
  return {
    puzzleId,
    words,
    scrambles,
    wordIndex: 0,
    status: "playing",
    picked: [],
    lockedTileIdxs: [],
    hintsUsed: 0,
    wrongSubmit: false,
    results: [],
  };
}

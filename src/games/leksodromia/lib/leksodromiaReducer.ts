// Leksodromia — pure reducer (no side effects, no React).
// All game state transitions live here. The reducer never reads Date.now():
// elapsed time arrives as the SUBMIT_WORD / SKIP_WORD payload from the clock
// hook, so time handling stays testable and refresh-proof.
//
// Input model: `picked` holds indices into the scrambled word (tile rack), so
// duplicate letters stay unambiguous. Hints lock a growing prefix of correct
// tiles (lockedTileIdxs) and clear the free picks — the player rebuilds the
// rest after the revealed prefix.
//
// Second chance: the FIRST skip of a word requeues it as a new step at the end
// of the run (retries), carrying the accumulated clock and hint count so the
// decay resumes exactly where it left off (no peek-skip-return exploit). A
// skip on a second-chance step is final: 0 points, recorded in results.

import { LEKSODROMIA } from "@/config/gameRules";

import type { LeksodromiaRetry, LeksodromiaState, LeksodromiaWordResult } from "../types";

import { computeWordPoints } from "./scoring";

// ─── Action types ─────────────────────────────────────────────────────────────

export type LeksodromiaAction =
  | { type: "PICK_TILE";     tileIndex: number }
  | { type: "ADD_LETTER";    letter: string }
  | { type: "REMOVE_LETTER" }
  | { type: "CLEAR_INPUT" }
  | { type: "SUBMIT_WORD";   elapsedMs: number }
  | { type: "USE_HINT" }
  | { type: "SKIP_WORD";     elapsedMs: number }
  | { type: "RESTORE_STATE"; wordIndex: number; results: LeksodromiaWordResult[]; currentHintsUsed: number; retries: Record<number, LeksodromiaRetry> };

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Total steps in the run: the base words plus one step per requeued skip. */
export function getTotalSteps(state: LeksodromiaState): number {
  return state.words.length + Object.keys(state.retries).length;
}

/** True when the current step is a second chance at a skipped word. */
export function isSecondChance(state: LeksodromiaState): boolean {
  return state.retries[state.wordIndex] !== undefined;
}

/** Index into words/scrambles for the current step (retry steps redirect). */
function origIndex(state: LeksodromiaState): number {
  return state.retries[state.wordIndex]?.origIndex ?? state.wordIndex;
}

/** The current answer word, or "" when the round is finished. */
export function getCurrentAnswer(state: LeksodromiaState): string {
  return state.words[origIndex(state)] ?? "";
}

/** The current scrambled rack, or "" when the round is finished. */
export function getCurrentScramble(state: LeksodromiaState): string {
  return state.scrambles[origIndex(state)] ?? "";
}

/** The decay-clock base for the current step (0 except on second chances). */
export function getRetryBaseElapsedMs(state: LeksodromiaState): number {
  return state.retries[state.wordIndex]?.baseElapsedMs ?? 0;
}

/** Letters currently in the answer row: hint-locked prefix + free picks. */
export function getCurrentInput(state: LeksodromiaState): string {
  const scramble = getCurrentScramble(state);
  return [...state.lockedTileIdxs, ...state.picked]
    .map((i) => scramble[i])
    .join("");
}

/** Rack tiles not yet consumed by a hint or a pick, in scramble order. */
export function getAvailableTileIndices(state: LeksodromiaState): number[] {
  const used = new Set([...state.lockedTileIdxs, ...state.picked]);
  const scramble = getCurrentScramble(state);
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

/**
 * Advance to the next step (recording `result` if given, requeue records
 * none). Entering a second-chance step restores its hint prefix; the clock
 * hook separately resumes from the retry's baseElapsedMs.
 */
function advance(
  state: LeksodromiaState,
  result: LeksodromiaWordResult | null,
  retries: Record<number, LeksodromiaRetry> = state.retries,
): LeksodromiaState {
  const results = result ? [...state.results, result] : state.results;
  const wordIndex = state.wordIndex + 1;
  const totalSteps = state.words.length + Object.keys(retries).length;
  const retry = retries[wordIndex];
  const hintsUsed = retry?.baseHints ?? 0;
  const nextOrig = retry?.origIndex ?? wordIndex;
  return {
    ...state,
    results,
    retries,
    wordIndex,
    status: wordIndex >= totalSteps ? "finished" : "playing",
    picked: [],
    lockedTileIdxs: lockPrefixTiles(
      state.scrambles[nextOrig] ?? "",
      state.words[nextOrig] ?? "",
      hintsUsed,
    ),
    hintsUsed,
    wrongSubmit: false,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function leksodromiaReducer(state: LeksodromiaState, action: LeksodromiaAction): LeksodromiaState {
  if (state.status === "finished" && action.type !== "RESTORE_STATE") return state;

  switch (action.type) {

    case "PICK_TILE": {
      const answer = getCurrentAnswer(state);
      if (getCurrentInput(state).length >= answer.length) return state;
      const { tileIndex } = action;
      if (state.picked.includes(tileIndex) || state.lockedTileIdxs.includes(tileIndex)) return state;
      if (tileIndex < 0 || tileIndex >= answer.length) return state;
      return { ...state, picked: [...state.picked, tileIndex], wrongSubmit: false };
    }

    case "ADD_LETTER": {
      const scramble = getCurrentScramble(state);
      const tileIndex = getAvailableTileIndices(state)
        .find((i) => scramble[i] === action.letter);
      if (tileIndex === undefined) return state;
      return leksodromiaReducer(state, { type: "PICK_TILE", tileIndex });
    }

    case "REMOVE_LETTER": {
      if (state.picked.length === 0) return state;
      return { ...state, picked: state.picked.slice(0, -1), wrongSubmit: false };
    }

    case "CLEAR_INPUT": {
      // Drop every free pick; the hint-locked prefix stays put.
      if (state.picked.length === 0 && !state.wrongSubmit) return state;
      return { ...state, picked: [], wrongSubmit: false };
    }

    case "SUBMIT_WORD": {
      const answer = getCurrentAnswer(state);
      const input = getCurrentInput(state);
      if (input.length < answer.length) return state;
      // Wrong word: flag the shake and wipe the free picks so the player can
      // rebuild instantly (the auto-submit UX). The hint prefix survives.
      if (input !== answer) return { ...state, wrongSubmit: true, picked: [] };
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
        lockedTileIdxs: lockPrefixTiles(getCurrentScramble(state), getCurrentAnswer(state), hintsUsed),
        picked: [], // free picks may conflict with the revealed prefix — reset
        wrongSubmit: false,
      };
    }

    case "SKIP_WORD": {
      // Second-chance skip is final: 0 points, into the results for good.
      if (isSecondChance(state)) {
        return advance(state, {
          word:      getCurrentAnswer(state),
          status:    "skipped",
          elapsedMs: action.elapsedMs,
          hintsUsed: state.hintsUsed,
          points:    0,
        });
      }
      // First skip requeues the word at the end of the run — no result yet.
      // Clock and hints carry over so the revisit resumes, never restarts.
      const newStep = getTotalSteps(state);
      return advance(state, null, {
        ...state.retries,
        [newStep]: {
          origIndex:     state.wordIndex,
          baseElapsedMs: action.elapsedMs,
          baseHints:     state.hintsUsed,
        },
      });
    }

    case "RESTORE_STATE": {
      const retries = action.retries;
      const totalSteps = state.words.length + Object.keys(retries).length;
      const wordIndex = Math.min(action.wordIndex, totalSteps);
      const finished = wordIndex >= totalSteps;
      const orig = retries[wordIndex]?.origIndex ?? wordIndex;
      const answer = state.words[orig] ?? "";
      const scramble = state.scrambles[orig] ?? "";
      const hintsUsed = finished ? 0 : action.currentHintsUsed;
      return {
        ...state,
        wordIndex,
        retries,
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
    retries: {},
    status: "playing",
    picked: [],
    lockedTileIdxs: [],
    hintsUsed: 0,
    wrongSubmit: false,
    results: [],
  };
}

"use client";

// useGameState — the main React hook for the Leksokipos game.
// Wires up the pure reducer with useReducer and exposes a clean API to components.
//
// Cross-device restore — one function, two call sites. restoreRound() runs the
// same gate and fetch for both; only the local-progress check differs:
//   Mount-time: skipped when localStorage already holds progress for this puzzle,
//   unless "leksokipos-needs-restore" is set (a transfer code was claimed in
//   another game while this component was unmounted).
//   Explicit: GameBoard calls restoreRound({ force: true }) immediately after a
//   transfer code claim while the game is already mounted — always fetches.

const NEEDS_RESTORE_KEY = "leksokipos-needs-restore";

import { buildInitialState, gameReducer } from "./gameReducer";
import { useCallback, useEffect, useMemo, useReducer } from "react";

import type { LeksokiposPuzzle, LeksokiposRoundSnapshot } from "../types";
import { isDailyPuzzle } from "../lib/puzzle";
import { normalizeLetters } from "../lib/normalize";
import { computeScoreFromWords, maxScore } from "../lib/scoring";
import { reconcileSnapshot } from "../lib/reconcile";
import { calculateRank } from "../lib/ranking";
import { pullSnapshot } from "../sync";
import { getOrCreateDeviceId, isProfileLinked, readSlice } from "@/hooks/useGameStore";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";
import { normalizePuzzleDate } from "@/lib/puzzleDate";

/**
 * Central game hook — all components talk to this, never to the reducer directly.
 *
 * @param initialPuzzle - The puzzle to start with (loaded from data layer)
 */
export function useGameState(initialPuzzle: LeksokiposPuzzle) {
  // Always start from clean state — avoids SSR/client hydration mismatch.
  const [state, dispatch] = useReducer(
    gameReducer,
    initialPuzzle,
    buildInitialState
  );

  // Memoize only the fields that should be persisted.
  // useMemo creates a new object reference only when these fields change,
  // which is what triggers the save effect inside useRoundPersistence.
  const snapshot = useMemo<LeksokiposRoundSnapshot>(() => ({
    foundWords:  state.foundWords,
    score:       state.score,
    currentRank: state.currentRank,
    startedAt:   state.startedAt,
    givenUp:     state.givenUp ?? false,
  }), [state.foundWords, state.score, state.currentRank, state.startedAt, state.givenUp]);

  const clearRound = useRoundPersistence<LeksokiposRoundSnapshot>(
    "leksokipos",
    initialPuzzle.id,
    snapshot,
    // Reconcile before restoring: the saved round is keyed on the puzzle id,
    // which is just the date, so a corpus edit can hand this puzzle a round
    // played on a different board. See lib/reconcile.ts.
    useCallback(
      (saved: LeksokiposRoundSnapshot) =>
        dispatch({ type: "RESTORE_STATE", saved: reconcileSnapshot(saved, initialPuzzle) }),
      // initialPuzzle is stable for the lifetime of this hook instance.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),
    // Only persist once there is meaningful progress — prevents the initial empty
    // state from being written to localStorage on mount, which would otherwise
    // block the cross-device server restore for puzzles not yet played locally.
    useCallback((snap: LeksokiposRoundSnapshot) => snap.foundWords.length > 0 || snap.givenUp, []),
  );

  // The one restore path. Daily puzzles with a linked profile only; resolves
  // without touching state whenever there is nothing to pull.
  const restoreRound = useCallback((opts?: { force?: boolean }): Promise<void> => {
    if (!isDailyPuzzle(initialPuzzle) || !isProfileLinked()) return Promise.resolve();

    // A transfer code claimed while this component was unmounted leaves the key
    // behind, and it forces the fetch through exactly like an explicit call does.
    const force = opts?.force === true || localStorage.getItem(NEEDS_RESTORE_KEY) === "true";
    if (!force && readSlice<Record<string, unknown>>("leksokipos")?.[initialPuzzle.id]) {
      return Promise.resolve();
    }

    localStorage.removeItem(NEEDS_RESTORE_KEY);

    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return Promise.resolve();

    return pullSnapshot({
      deviceUuid: deviceId,
      puzzleDate: normalizePuzzleDate(initialPuzzle.id),
      puzzle:     initialPuzzle,
    }).then((saved) => {
      if (saved) dispatch({ type: "RESTORE_STATE", saved });
    });
  // initialPuzzle is stable for the lifetime of this hook instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void restoreRound(); }, [restoreRound]);

  // Pre-compute the allowed letter set once per puzzle.
  const allowedLetters = useMemo(
    () => new Set([state.puzzle.centerLetter, ...state.puzzle.outerLetters].map(normalizeLetters)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.puzzle.id]
  );

  // ── Dispatch helpers ──────────────────────────────────────────────────────────

  const addLetter = useCallback(
    (letter: string) => dispatch({ type: "ADD_LETTER", letter }),
    []
  );

  const deleteLetter = useCallback(
    () => dispatch({ type: "DELETE_LETTER" }),
    []
  );

  const clearInput = useCallback(
    () => dispatch({ type: "CLEAR_INPUT" }),
    []
  );

  const submitWord = useCallback(
    () => dispatch({ type: "SUBMIT_WORD" }),
    []
  );

  const shuffleLetters = useCallback(
    () => dispatch({ type: "SHUFFLE_LETTERS" }),
    []
  );

  const handleKeyboardLetter = useCallback(
    (rawKey: string) => {
      const letter = normalizeLetters(rawKey);
      if (allowedLetters.has(letter)) dispatch({ type: "ADD_LETTER", letter });
    },
    [allowedLetters]
  );

  const giveUp = useCallback(
    () => dispatch({ type: "GIVE_UP" }),
    []
  );

  const godModeInject = useCallback(
    (words: string[]) => {
      const pMax = maxScore(initialPuzzle);
      const score = computeScoreFromWords(words, initialPuzzle);
      const currentRank = calculateRank(score, pMax);
      dispatch({ type: "GOD_MODE_INJECT", foundWords: words, score, currentRank });
    },
    // initialPuzzle is stable for the lifetime of this hook instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const resetGame = useCallback(
    () => {
      clearRound();
      dispatch({ type: "NEW_GAME", puzzle: initialPuzzle });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearRound]
  );

  return {
    puzzle:          state.puzzle,
    currentInput:    state.currentInput,
    foundWords:      state.foundWords,
    score:           state.score,
    currentRank:     state.currentRank,
    puzzleMaxScore:  state.puzzleMaxScore,
    lastSubmission:  state.lastSubmission,
    givenUp:         state.givenUp ?? false,

    addLetter,
    deleteLetter,
    clearInput,
    submitWord,
    shuffleLetters,
    handleKeyboardLetter,
    giveUp,
    restoreRound,
    godModeInject,
    resetGame,
  };
}

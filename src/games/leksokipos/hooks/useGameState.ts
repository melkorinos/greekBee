"use client";

// useGameState — the main React hook for the Leksokipos game.
// Wires up the pure reducer with useReducer and exposes a clean API to components.
//
// Cross-device restore: on mount, when the player has a linked profile and no
// local progress exists yet, the hook fetches today's found words from the
// server (game_state table) and dispatches RESTORE_STATE. This covers the
// "just claimed a transfer code on a new device" case.

import { buildInitialState, gameReducer } from "./gameReducer";
import { useCallback, useEffect, useMemo, useReducer } from "react";

import type { LeksokiposPuzzle, LeksokiposRoundSnapshot } from "../types";
import { calculateRank } from "../lib/ranking";
import { isDailyPuzzle } from "../lib/puzzle";
import { maxScore, scoreWord } from "../lib/scoring";
import { normalizeLetters } from "../lib/normalize";
import { getOrCreateDeviceId, isProfileLinked, readSlice } from "@/hooks/useGameStore";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";

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
    useCallback((saved) => dispatch({ type: "RESTORE_STATE", saved }), []),
  );

  // Restore found words from the server on the first open of a daily puzzle
  // when no local progress exists. Gates: ProfileLinked + daily + no local session.
  // Server wins — no merge. If devices have diverged, generate a fresh
  // transfer code from the device with more progress (see ADR 0003).
  useEffect(() => {
    if (!isDailyPuzzle(initialPuzzle)) return;
    if (!isProfileLinked()) return;

    // Skip when localStorage already holds progress for this puzzle.
    // Checked directly (not via state) to avoid a race with useRoundPersistence's
    // own mount effect, which fires in the same render pass.
    const localStore = readSlice<Record<string, unknown>>("leksokipos");
    if (localStore?.[initialPuzzle.id]) return;

    const deviceId = getOrCreateDeviceId();
    if (!deviceId) return;

    // Puzzle IDs are "YYYY-MM-DD-el"; the API expects plain "YYYY-MM-DD".
    const puzzleDate = initialPuzzle.id.replace(/-[a-z]{2}$/i, "");

    fetch(
      `/api/game-state?device_uuid=${encodeURIComponent(deviceId)}&game_id=leksokipos&puzzle_date=${encodeURIComponent(puzzleDate)}`
    )
      .then((r) => r.json())
      .then((data: { state?: { foundWords?: string[] } | null }) => {
        const foundWords = data.state?.foundWords;
        if (!Array.isArray(foundWords) || foundWords.length === 0) return;

        const score = foundWords.reduce((sum, w) => sum + scoreWord(w, initialPuzzle), 0);
        dispatch({
          type: "RESTORE_STATE",
          saved: {
            foundWords,
            score,
            currentRank: calculateRank(score, maxScore(initialPuzzle)),
            startedAt:   Date.now(),
            givenUp:     false,
          },
        });
      })
      .catch(() => {}); // never block gameplay
  // initialPuzzle is stable for the lifetime of this hook instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const newGame = useCallback(
    (puzzle: LeksokiposPuzzle) => {
      clearRound();
      dispatch({ type: "NEW_GAME", puzzle });
    },
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
    newGame,
    giveUp,
  };
}

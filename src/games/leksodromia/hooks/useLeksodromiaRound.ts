"use client";

// useLeksodromiaRound — the round spine: reducer + clock + persistence.
// Persists { puzzleId, wordIndex, currentElapsedMs, currentHintsUsed, results }
// under the puzzle date so a refresh restores both progress AND the decay
// clock (refresh-abuse-proof). The snapshot's elapsed is coarsened to whole
// seconds so localStorage is written at most ~1×/s, not per clock tick.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { LeksodromiaRetry, LeksodromiaState, LeksodromiaWordResult } from "../types";
import {
  getRetryBaseElapsedMs,
  leksodromiaReducer,
  makeInitialLeksodromiaState,
} from "../lib/leksodromiaReducer";
import type { LeksodromiaAction } from "../lib/leksodromiaReducer";
import { useElapsedClock } from "./useElapsedClock";
import { useRoundPersistence } from "@/hooks/useRoundPersistence";

interface LeksodromiaPuzzle {
  /** ISO date (YYYY-MM-DD) — puzzle id and persistence session key. */
  date:      string;
  words:     string[];
  scrambles: string[];
}

interface RoundSnapshot {
  puzzleId:         string;
  wordIndex:        number;
  currentElapsedMs: number;
  currentHintsUsed: number;
  results:          LeksodromiaWordResult[];
  /** Second-chance steps (requeued skips). Absent in pre-second-chance saves. */
  retries?:         Record<number, LeksodromiaRetry>;
}

interface LeksodromiaRound {
  state:        LeksodromiaState;
  dispatch:     (action: LeksodromiaAction) => void;
  /** Live coarse elapsed for the decaying points counter. */
  elapsedMs:    number;
  getElapsedMs: () => number;
  /** Submit the current input, stamping the exact elapsed time. */
  submitWord:   () => void;
  /** Skip the current word for 0 points. */
  skipWord:     () => void;
  /** Pause/resume the clock (HowToPlay or pause modal open). */
  setPaused:    (paused: boolean) => void;
}

export function useLeksodromiaRound(puzzle: LeksodromiaPuzzle): LeksodromiaRound {
  const [state, dispatch] = useReducer(
    leksodromiaReducer,
    undefined,
    () => makeInitialLeksodromiaState(puzzle.date, puzzle.words, puzzle.scrambles),
  );

  const [paused, setPaused] = useState(false);

  const { elapsedMs, getElapsedMs, reset } = useElapsedClock(
    state.status === "playing" && !paused,
  );

  // ── Clock reset on word advance ─────────────────────────────────────────────
  // RESTORE_STATE may also change wordIndex; that transition must keep the
  // persisted elapsed instead of zeroing it, hence the skip flag. A second-
  // chance step resumes from the retry's accumulated base, never from zero.
  const prevWordIndexRef  = useRef(state.wordIndex);
  const skipNextResetRef  = useRef(false);
  useEffect(() => {
    if (prevWordIndexRef.current === state.wordIndex) return;
    prevWordIndexRef.current = state.wordIndex;
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    reset(getRetryBaseElapsedMs(state));
  }, [state, reset]);

  // ── Persistence ─────────────────────────────────────────────────────────────

  const onRestore = useCallback((saved: RoundSnapshot) => {
    // Restore happens only on a fresh mount (wordIndex 0), so the advance
    // effect fires iff the saved index is past the first word.
    if (saved.wordIndex > 0) skipNextResetRef.current = true;
    reset(saved.currentElapsedMs);
    dispatch({
      type:             "RESTORE_STATE",
      wordIndex:        saved.wordIndex,
      results:          saved.results,
      currentHintsUsed: saved.currentHintsUsed,
      retries:          saved.retries ?? {},
    });
  }, [reset]);

  // Coarsen to whole seconds — caps write frequency without losing the clock.
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const snapshot = useMemo<RoundSnapshot>(() => ({
    puzzleId:         state.puzzleId,
    wordIndex:        state.wordIndex,
    currentElapsedMs: elapsedSec * 1000,
    currentHintsUsed: state.hintsUsed,
    results:          state.results,
    retries:          state.retries,
  }), [state.puzzleId, state.wordIndex, state.hintsUsed, state.results, state.retries, elapsedSec]);

  useRoundPersistence<RoundSnapshot>(
    "leksodromia",
    puzzle.date,
    snapshot,
    onRestore,
    // Never write an untouched round — and never clobber a saved one with the
    // pristine pre-hydration state.
    (snap) =>
      snap.wordIndex > 0 ||
      snap.results.length > 0 ||
      snap.currentHintsUsed > 0 ||
      snap.currentElapsedMs > 0,
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  const submitWord = useCallback(() => {
    dispatch({ type: "SUBMIT_WORD", elapsedMs: getElapsedMs() });
  }, [getElapsedMs]);

  const skipWord = useCallback(() => {
    dispatch({ type: "SKIP_WORD", elapsedMs: getElapsedMs() });
  }, [getElapsedMs]);

  return { state, dispatch, elapsedMs, getElapsedMs, submitWord, skipWord, setPaused };
}

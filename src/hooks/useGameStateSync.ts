"use client";

// useGameStateSync — pushes Leksokipos game state to the server after each
// valid word submission so the player can restore progress on another device.
//
// Rules:
//   - Daily puzzles only (custom puzzles have no meaningful date anchor)
//   - Only fires when the player has an active cross-device profile
//   - Triggers when foundWords grows — not on letter input, shuffle, or delete
//   - Network errors are silently swallowed; sync must never affect gameplay

import { useEffect, useRef } from "react";

import { getOrCreateDeviceId, isProfileLinked } from "@/hooks/useGameStore";

interface UseGameStateSyncOptions {
  puzzleDate:   string;
  isDaily:      boolean;
  foundWords:   string[];
  score:        number;
  currentInput: string;
}

export function useGameStateSync({
  puzzleDate,
  isDaily,
  foundWords,
  score,
  currentInput,
}: UseGameStateSyncOptions): void {
  // Initialised to the current length so that mount (or a state restore that
  // pre-populates foundWords) does not trigger an unnecessary push.
  const prevLengthRef = useRef(foundWords.length);

  useEffect(() => {
    if (!isDaily || !isProfileLinked()) return;

    // Only push when a new word was accepted — never on a length decrease
    // (which cannot happen in normal play) or a no-change render.
    if (foundWords.length <= prevLengthRef.current) {
      prevLengthRef.current = foundWords.length;
      return;
    }

    prevLengthRef.current = foundWords.length;

    const deviceUuid = getOrCreateDeviceId();
    if (!deviceUuid) return;

    fetch("/api/game-state", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        device_uuid:  deviceUuid,
        game_id:      "leksokipos",
        puzzle_date:  puzzleDate,
        state: { foundWords, score, currentInput },
      }),
    }).catch(() => {});
  // foundWords (array ref) changes on every valid submit — that's our trigger.
  // score and currentInput are included so the state blob is always fresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundWords]);
}

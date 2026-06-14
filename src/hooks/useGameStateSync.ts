"use client";

// useGameStateSync — pushes Leksokipos found words to the server after each
// valid word submission so the player can restore progress on another device.
//
// Rules:
//   - Daily puzzles only (custom puzzles have no meaningful date anchor)
//   - Only fires when the player has an active cross-device profile
//   - Triggers when foundWords grows — not on letter input, shuffle, or delete
//   - Backfills the existing set the moment the profile becomes linked, so words
//     found *before* linking (the normal pre-transfer flow) reach the server
//   - Network errors are silently swallowed; sync must never affect gameplay

import { useEffect, useRef } from "react";

import { getOrCreateDeviceId } from "@/hooks/useGameStore";

interface UseGameStateSyncOptions {
  puzzleDate:    string;
  isDaily:       boolean;
  foundWords:    string[];
  /** Reactive linked flag. Flipping it true backfills already-found words. */
  profileLinked: boolean;
}

export function useGameStateSync({
  puzzleDate,
  isDaily,
  foundWords,
  profileLinked,
}: UseGameStateSyncOptions): void {
  // Initialised to the current length so that mount (or a state restore that
  // pre-populates foundWords) does not trigger an unnecessary push.
  const prevLengthRef = useRef(foundWords.length);
  // Tracks the previous linked state so we can detect the unlinked→linked edge.
  const prevLinkedRef = useRef(profileLinked);

  useEffect(() => {
    if (!isDaily || !profileLinked) {
      prevLinkedRef.current = profileLinked;
      return;
    }

    // The profile just became linked — backfill everything found while unlinked,
    // regardless of whether the word count grew this render.
    const justLinked = !prevLinkedRef.current;
    prevLinkedRef.current = profileLinked;

    // Otherwise only push when a new word was accepted — never on a length
    // decrease (which cannot happen in normal play) or a no-change render.
    if (!justLinked && foundWords.length <= prevLengthRef.current) {
      prevLengthRef.current = foundWords.length;
      return;
    }

    prevLengthRef.current = foundWords.length;

    // Nothing to sync yet (e.g. linked before finding any word).
    if (foundWords.length === 0) return;

    const deviceUuid = getOrCreateDeviceId();
    if (!deviceUuid) return;

    fetch("/api/game-state", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        device_uuid:  deviceUuid,
        game_id:      "leksokipos",
        puzzle_date:  puzzleDate,
        state: { foundWords },
      }),
    }).catch(() => {});
  // foundWords (array ref) changes on every valid submit — that's our per-word
  // trigger. profileLinked flipping true is the backfill trigger for words found
  // before the profile existed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundWords, profileLinked]);
}

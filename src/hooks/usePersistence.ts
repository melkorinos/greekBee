// usePersistence — saves and restores Spelling Bee game state.
// Delegates all localStorage access to useGameStore so the game never
// touches localStorage directly and cross-game isolation is enforced.

"use client";

import type { GameState, SpellingBeePuzzle } from "@/games/spelling-bee/types";
import { clearSlice, migrateFromLegacyKeys, readSlice, writeSlice } from "./useGameStore";

import { useEffect } from "react";

// Shape of the data we persist for Spelling Bee
interface SpellingBeeSnapshot {
  puzzleId: string;
  foundWords: string[];
  score: number;
  currentRank: string;
  startedAt: number;
  givenUp?: boolean;
}

/**
 * Saves the current game state to the "spelling-bee" store slice whenever it changes.
 * Only persists fields needed to resume — skips lastSubmission (transient UI).
 */
export function usePersistence(state: GameState): void {
  useEffect(() => {
    const snapshot: SpellingBeeSnapshot = {
      puzzleId: state.puzzle.id,
      foundWords: state.foundWords,
      score: state.score,
      currentRank: state.currentRank,
      startedAt: state.startedAt,
      givenUp: state.givenUp,
    };
    writeSlice("spelling-bee", snapshot);
  }, [state.puzzle.id, state.foundWords, state.score, state.currentRank, state.startedAt, state.givenUp]);
}

/**
 * Attempts to load a previously saved session for the given puzzle.
 * Runs the one-time legacy key migration on first call.
 * Returns null if nothing is saved, the puzzle has changed, or the data is corrupt.
 */
export function loadPersistedState(puzzle: SpellingBeePuzzle): Partial<GameState> | null {
  try {
    // Migrate old "spelling-bee:state" key to the unified envelope if it exists
    migrateFromLegacyKeys();

    const snapshot = readSlice<SpellingBeeSnapshot>("spelling-bee");
    if (!snapshot) return null;

    // If the saved state belongs to a different puzzle, discard it
    if (snapshot.puzzleId !== puzzle.id) return null;

    return {
      foundWords: snapshot.foundWords ?? [],
      score: snapshot.score ?? 0,
      currentRank: (snapshot.currentRank as GameState["currentRank"]) ?? "Beginner",
      startedAt: snapshot.startedAt ?? Date.now(),
      givenUp: snapshot.givenUp ?? false,
    };
  } catch {
    // Corrupt data — start fresh
    return null;
  }
}

/**
 * Clears the Spelling Bee slice from the unified store.
 * Called when starting a new game so stale data doesn't bleed into the next session.
 */
export function clearPersistedState(): void {
  clearSlice("spelling-bee");
}


// usePersistence — saves and restores game state in localStorage.
// Kept as a separate hook so it can be tested or swapped out independently.

"use client";

import type { GameState, Puzzle } from "@/types";

import { useEffect } from "react";

/** The key used to store game state in localStorage */
const STORAGE_KEY = "spelling-bee:state";

/**
 * Saves the current game state to localStorage whenever it changes.
 * Only persists the fields needed to resume a session (not transient UI state).
 */
export function usePersistence(state: GameState): void {
  useEffect(() => {
    try {
      // Only persist the fields required to resume — skip lastSubmission (transient UI)
      const snapshot = {
        puzzleId: state.puzzle.id,
        foundWords: state.foundWords,
        score: state.score,
        currentRank: state.currentRank,
        startedAt: state.startedAt,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // localStorage can be unavailable (private browsing, storage full)
      // Silently ignore — game still works, just won't persist
    }
  }, [state.foundWords, state.score, state.currentRank]);
}

/**
 * Attempts to load a previously saved session for the given puzzle.
 * Returns null if nothing is saved, the puzzle has changed, or the data is corrupt.
 */
export function loadPersistedState(puzzle: Puzzle): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw);

    // If the saved state belongs to a different puzzle, discard it
    if (snapshot.puzzleId !== puzzle.id) return null;

    return {
      foundWords: snapshot.foundWords ?? [],
      score: snapshot.score ?? 0,
      currentRank: snapshot.currentRank ?? "Beginner",
      startedAt: snapshot.startedAt ?? Date.now(),
    };
  } catch {
    // Corrupt data — start fresh
    return null;
  }
}

/**
 * Clears any saved game state from localStorage.
 * Called when starting a new game so stale data doesn't bleed into the next session.
 */
export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — same rationale as above
  }
}

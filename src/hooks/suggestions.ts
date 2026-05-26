// suggestions.ts — tracks words this device has already suggested.
// Reads/writes the "suggestions" slice of the unified localStorage envelope.
// Not a React hook — plain utility functions safe to call from any client code.

import { readSlice, writeSlice } from "./useGameStore";

function normalise(word: string): string {
  return word.toLowerCase().trim();
}

/** Returns all words this device has already suggested for addition. */
export function getSuggestedWords(): string[] {
  if (typeof window === "undefined") return [];
  return readSlice<string[]>("suggestions") ?? [];
}

/**
 * Returns true if this device has already submitted an add-nomination for this word.
 * Always returns false on the server (localStorage not available).
 */
export function isSuggested(word: string): boolean {
  return getSuggestedWords().includes(normalise(word));
}

/**
 * Records that this device has suggested a word for addition.
 * Idempotent — calling it twice for the same word has no effect.
 */
export function markSuggested(word: string): void {
  if (typeof window === "undefined") return;
  const norm = normalise(word);
  const list = getSuggestedWords();
  if (!list.includes(norm)) {
    writeSlice("suggestions", [...list, norm]);
  }
}

// ── Removal reports ──────────────────────────────────────────────────────────

/** Returns all words this device has already flagged for removal. */
export function getReportedWords(): string[] {
  if (typeof window === "undefined") return [];
  return readSlice<string[]>("reports") ?? [];
}

/**
 * Returns true if this device has already flagged this word for removal.
 * Always returns false on the server.
 */
export function isReported(word: string): boolean {
  return getReportedWords().includes(normalise(word));
}

/**
 * Records that this device has flagged a word for removal.
 * Idempotent — calling it twice for the same word has no effect.
 */
export function markReported(word: string): void {
  if (typeof window === "undefined") return;
  const norm = normalise(word);
  const list = getReportedWords();
  if (!list.includes(norm)) {
    writeSlice("reports", [...list, norm]);
  }
}

// pangrams.ts — pure route-input hygiene for the pangram-tier lane (zero React).
//
// player_pangrams is append-forever with OPEN RLS (mirrors game_state), so junk
// written there is permanent and no id whitelist is possible for arbitrary words
// (unlike /api/achievements). We bound the junk by shape instead. The server runs
// ZERO detection (ADR 0013) — this is hygiene, never verification against a puzzle.

import { normalizeLetters } from "@/lib/normalize";

/** Max pangram words accepted per POST — bounds junk on the append-forever table. */
export const MAX_PANGRAMS_PER_REQUEST = 50;

/**
 * Post-normalize shape a pangram word must match: 7–24 Greek lowercase letters.
 * A pangram uses all seven puzzle letters, so its length is ≥ 7; 24 is a generous
 * upper bound on real Greek words. Bounds junk, not a correctness check.
 */
const PANGRAM_SHAPE_RE = /^[α-ω]{7,24}$/;

/**
 * Normalize each candidate (the UNIQUE text key must never see two casings or
 * accent-forms of one find, or the count inflates), drop anything that can't be a
 * pangram by shape, de-dupe, and cap the batch. Returns [] for non-array input.
 */
export function sanitizePangramWords(words: unknown): string[] {
  if (!Array.isArray(words)) return [];
  const cleaned = words
    .filter((w): w is string => typeof w === "string")
    .map((w) => normalizeLetters(w))
    .filter((w) => PANGRAM_SHAPE_RE.test(w));
  return [...new Set(cleaned)].slice(0, MAX_PANGRAMS_PER_REQUEST);
}

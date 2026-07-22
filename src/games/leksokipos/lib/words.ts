// words.ts — pure route-input hygiene for the words-by-length capture lane (zero React).
//
// player_words is append-forever with OPEN RLS (mirrors player_pangrams), so junk
// written there is permanent and no id whitelist is possible for arbitrary words
// (the server runs ZERO validation against a puzzle — ADR 0013 lane C). We bound
// the junk by shape instead. This is hygiene, never a correctness check: the client
// only ever posts words the puzzle already accepted, so a "wrong" word here means a
// tampered request, not a gameplay bug.

import { normalizeLetters } from "@/lib/normalize";
import { LEKSOKIPOS } from "@/config/gameRules";

/**
 * Max words accepted per POST — bounds junk on the append-forever table. A rich
 * daily puzzle can have well over a hundred valid words, and the mount self-heal
 * re-posts the whole found set, so this sits comfortably above a full round.
 */
export const MAX_WORDS_PER_REQUEST = 200;

/**
 * Post-normalize shape a captured word must match: MIN_WORD_LENGTH…24 Greek
 * lowercase letters. The lower bound is the game's own minimum find length; 24 is a
 * generous upper bound on real Greek words. Bounds junk, not a correctness check.
 */
const WORD_SHAPE_RE = new RegExp(`^[α-ω]{${LEKSOKIPOS.MIN_WORD_LENGTH},24}$`);

/**
 * Normalize each candidate (the UNIQUE text key must never see two casings or
 * accent-forms of one find, or a length bucket double-counts), drop anything that
 * can't be a valid find by shape, de-dupe, and cap the batch. Returns [] for
 * non-array input.
 */
export function sanitizeFoundWords(words: unknown): string[] {
  if (!Array.isArray(words)) return [];
  const cleaned = words
    .filter((w): w is string => typeof w === "string")
    .map((w) => normalizeLetters(w))
    .filter((w) => WORD_SHAPE_RE.test(w));
  return [...new Set(cleaned)].slice(0, MAX_WORDS_PER_REQUEST);
}

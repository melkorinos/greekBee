// parseCustomUrl — validates and normalises the raw [center]/[outer] URL params
// for the custom Spelling Bee route (/spelling-bee/[center]/[outer]).
//
// Extracted as a pure function so it can be unit-tested independently of Next.js.
// No React imports — safe to import from game-logic land.

import { normalizeLetters } from "./normalize";

/** Matches any single Unicode letter (Greek, Latin, etc.) */
const LETTER_RE = /^\p{L}$/u;

function isLetter(ch: string): boolean {
  return LETTER_RE.test(ch);
}

/**
 * Validates and normalises the raw URL path params for a custom puzzle URL.
 *
 * Rules:
 *  - `rawCenter` must decode + normalise to exactly 1 letter
 *  - `rawOuter`  must decode + normalise to exactly 6 letters
 *  - All 7 combined letters must be unique (no duplicates)
 *
 * Returns `null` (→ 404) if any rule is violated.
 */
export function parseCustomUrl(
  rawCenter: string,
  rawOuter: string
): { center: string; outer: string[] } | null {
  const center = normalizeLetters(decodeURIComponent(rawCenter));
  const outerChars = [...normalizeLetters(decodeURIComponent(rawOuter))];

  if (center.length !== 1 || !isLetter(center)) return null;
  if (outerChars.length !== 6 || outerChars.some((ch) => !isLetter(ch))) return null;

  const all = [center, ...outerChars];
  if (new Set(all).size !== 7) return null;

  return { center, outer: outerChars };
}

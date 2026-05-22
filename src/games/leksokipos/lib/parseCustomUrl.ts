// parseCustomUrl — validates and normalises the raw [center]/[outer] URL params
// for the custom Spelling Bee route (/spelling-bee/[center]/[outer]).
//
// Extracted as a pure function so it can be unit-tested independently of Next.js.
// No React imports — safe to import from game-logic land.
//
// Accepts two input formats:
//   1. Greeklish  — pure ASCII a-z (e.g. "k", "aeiost")  → converted to Greek internally
//   2. Greek      — Unicode Greek letters (e.g. "κ", "αειοστ") → normalised as before
//
// Greeklish is the canonical URL format going forward; Greek (percent-encoded
// or raw) is still accepted so old bookmarks and server-redirect paths work.

import { greeklishToGreek, isGreeklish } from "@/lib/greeklish";

import { normalizeLetters } from "./normalize";

/** Matches any single Unicode letter (Greek, Latin, etc.) */
const LETTER_RE = /^\p{L}$/u;

function isLetter(ch: string): boolean {
  return LETTER_RE.test(ch);
}

/**
 * Decodes and converts a raw URL segment to its internal (normalised Greek) form.
 *
 * If the decoded value is entirely greeklish (pure ASCII a-z), it is converted
 * to Greek via the bijective greeklish map.  Otherwise it is treated as Greek
 * and passed through `normalizeLetters` (strips accents, ς→σ).
 */
function toInternalGreek(raw: string): string {
  const decoded = decodeURIComponent(raw).toLowerCase();
  return isGreeklish(decoded) ? greeklishToGreek(decoded) : normalizeLetters(decoded);
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
  const center = toInternalGreek(rawCenter);
  const outerChars = [...toInternalGreek(rawOuter)];

  if (center.length !== 1 || !isLetter(center)) return null;
  if (outerChars.length !== 6 || outerChars.some((ch) => !isLetter(ch))) return null;

  const all = [center, ...outerChars];
  if (new Set(all).size !== 7) return null;

  return { center, outer: outerChars };
}

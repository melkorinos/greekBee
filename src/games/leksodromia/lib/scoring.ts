// Leksodromia — pure scoring (no side effects, no React).
// Decay-to-floor: a word starts at full BASE points and decays linearly to a
// floor over DECAY_SECONDS; it never reaches zero, so the round is always
// finishable. Hints cost a fixed percentage of BASE. A solved word never
// scores below MIN_SOLVED_POINTS — solving always beats skipping (0).

import { LEKSODROMIA } from "@/config/gameRules";

import type { LeksodromiaLength } from "../types";

/**
 * Points for a solved word.
 *
 *   points(t) = max(FLOOR, BASE − (BASE − FLOOR) × min(t, DECAY)/DECAY)
 *   final     = max(MIN_SOLVED_POINTS, round(points − hintsUsed × HINT_COST_RATIO × BASE))
 *
 * @param elapsedMs - Active solve time in ms (negative treated as 0)
 * @param length    - Word length — determines BASE points
 * @param hintsUsed - Hints taken on this word (reducer caps at MAX_HINTS_PER_WORD)
 */
export function computeWordPoints(
  elapsedMs: number,
  length: LeksodromiaLength,
  hintsUsed: number,
): number {
  const base    = LEKSODROMIA.BASE_POINTS[length];
  const floor   = base * LEKSODROMIA.FLOOR_RATIO;
  const decayMs = LEKSODROMIA.DECAY_SECONDS * 1000;

  const t       = Math.min(Math.max(elapsedMs, 0), decayMs);
  const decayed = base - (base - floor) * (t / decayMs);
  const final   = decayed - hintsUsed * LEKSODROMIA.HINT_COST_RATIO * base;

  return Math.max(LEKSODROMIA.MIN_SOLVED_POINTS, Math.round(final));
}

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

/**
 * Fill fraction for the live decay bar: 1 at t=0, easing linearly to 0 at
 * DECAY_SECONDS, then flat at 0. This is the points fraction of the decay range
 * — (points − floor) / (base − floor) — which reduces to (1 − t/DECAY) and is
 * therefore **base-independent**: the bar depletes at the same visual rate on a
 * 4-letter word and an 8-letter word, unlike the raw points number (whose slope
 * scales with BASE). A depleted bar still scores the 25% floor — never zero — so
 * it is a reassurance, not a failure. Hint deductions are deliberately excluded
 * so the bar drains smoothly instead of jumping.
 *
 * @param elapsedMs - Active solve time in ms (negative treated as 0)
 */
export function computeDecayFraction(elapsedMs: number): number {
  const decayMs = LEKSODROMIA.DECAY_SECONDS * 1000;
  const t       = Math.min(Math.max(elapsedMs, 0), decayMs);
  return 1 - t / decayMs;
}

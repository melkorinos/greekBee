// evaluateGuess.ts — score one price guess against the target (pure, no React).
// This is the game's only genuinely new logic: topothesies scores by geo
// distance, we score by PRICE PROXIMITY. A guess wins when it lands within the
// puzzle's tolerance band; otherwise it reports which way the true price lies
// (higher/lower) and how close it was (a proximity %, scaled by config).

import { POSOKANEI } from "@/config/gameRules";

import type { PriceDirection } from "../types";

/**
 * Evaluate `guess` (euros) against the reference `price` with a `band` tolerance
 * (a fraction of the price, e.g. 0.10 = ±10%). Returns whether it wins, the
 * direction of the true price relative to the guess, and a 0–100 closeness.
 *
 * `proximityPct` = 1 − relativeError / PROXIMITY_MAX_REL, clamped to [0, 100],
 * where relativeError = |guess − price| / price. Exact guess → 100; a guess off
 * by PROXIMITY_MAX_REL of the price (or more) → 0.
 */
export function evaluatePriceGuess(
  guess: number,
  price: number,
  band: number,
): { correct: boolean; direction: PriceDirection; proximityPct: number } {
  // Data guarantees price > 0; guard anyway so the pure fn never divides by zero.
  const denom = price > 0 ? price : 1;
  const relError = Math.abs(guess - price) / denom;

  const proximityPct = Math.max(
    0,
    Math.min(100, Math.round(100 * (1 - relError / POSOKANEI.PROXIMITY_MAX_REL))),
  );

  // +epsilon so a guess exactly on the band edge counts (float noise like
  // |2.2 − 2.0| = 0.2000000000000002 must not lose an otherwise-winning guess).
  const correct = Math.abs(guess - price) <= price * band + 1e-9;
  const direction: PriceDirection = correct ? "correct" : guess < price ? "higher" : "lower";

  return { correct, direction, proximityPct };
}

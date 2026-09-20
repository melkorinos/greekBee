// Leksiarxeio answer pools, the daily-answer pick, and the same-day derivation.
//
// This module owns ONE question: which word is Leksiarxeio's answer for a given
// date and length. `buildFallbackPuzzle` (./index.ts) asks it to build the day's
// puzzle, and `getSameDayFallbackAnswers` asks it for all five so a derived game
// can forbid them — a recap must never leak another game's daily answer. Both
// callers must move in lockstep, which is why the pick lives here rather than in
// either of them.
//
// This file imports ONLY the answers-*.json pools (≈300 KB) and the small
// exclusions map — never words-*.json nor the Leksiarxeio index barrel, whose
// module graph statically pulls the MB-scale guess lists (Fluid CPU: derived-game
// routes must not parse those on cold start).

import { LEKSIARXEIO } from "@/config/gameRules";
import { dateToHashIndex, dateToIndex } from "@/lib/puzzleRotation";

import answers4 from "./answers-4.json";
import answers5 from "./answers-5.json";
import answers6 from "./answers-6.json";
import answers7 from "./answers-7.json";
import answers8 from "./answers-8.json";
import excluded from "./answers-excluded.json";

type LeksiarxeioLength = (typeof LEKSIARXEIO.LENGTHS)[number];

/**
 * Curated daily-answer pools keyed by word length (4–8). Read-only reuse only.
 *
 * These are the FULL pools, excluded words included. Nothing is deleted from
 * them: a pool's length is the modulus of the pre-cutover walk, so dropping a
 * word would silently re-date every past answer (measured: 590 of 628 days).
 * Exclusion is applied at pick time instead — see `playablePool`.
 */
export const LEKSIARXEIO_ANSWER_POOLS: Record<LeksiarxeioLength, readonly string[]> = {
  4: answers4 as string[],
  5: answers5 as string[],
  6: answers6 as string[],
  7: answers7 as string[],
  8: answers8 as string[],
};

/**
 * Words that may never be served as a NEW daily answer: loanwords, proper nouns,
 * archaic inflections, vulgarities and non-words that the frequency-ordered pools
 * carry in their tails. Grouped by reason in the JSON so the *why* survives and a
 * later session does not re-litigate each word one at a time.
 *
 * Guess validation is deliberately unaffected — these stay in words-{N}.json, so
 * a player may still type ΣΟΥΤ. Rejecting a word a Greek speaker knows is worse
 * than never posing it (decided 2026-09-21).
 */
const EXCLUDED_BY_LENGTH: Partial<Record<LeksiarxeioLength, ReadonlySet<string>>> =
  Object.fromEntries(
    Object.entries(excluded as Record<string, Record<string, string[]>>).map(
      ([length, byReason]) => [Number(length), new Set(Object.values(byReason).flat())],
    ),
  );

/** Every excluded word for `length`, flattened across reasons. Empty when unaudited. */
export function getExcludedAnswers(length: LeksiarxeioLength): ReadonlySet<string> {
  return EXCLUDED_BY_LENGTH[length] ?? new Set();
}

/** True once `date` is on or after the cutover AND `length` has an audited pool. */
function usesCuratedRotation(date: string, length: LeksiarxeioLength): boolean {
  return (
    date >= LEKSIARXEIO.CURATED_ROTATION_FROM &&
    (LEKSIARXEIO.CURATED_ROTATION_LENGTHS as readonly number[]).includes(length)
  );
}

// Filtering is per length and never changes, so it is done once per module load
// rather than on every request — these routes are on the Fluid CPU budget.
const PLAYABLE_POOLS = new Map<LeksiarxeioLength, readonly string[]>();

function playablePool(length: LeksiarxeioLength): readonly string[] {
  const cached = PLAYABLE_POOLS.get(length);
  if (cached) return cached;

  const exclude = getExcludedAnswers(length);
  const pool = LEKSIARXEIO_ANSWER_POOLS[length].filter((word) => !exclude.has(word));
  PLAYABLE_POOLS.set(length, pool);
  return pool;
}

/**
 * The answer Leksiarxeio serves on `date` at `length`.
 *
 * Two eras, and the boundary is `LEKSIARXEIO.CURATED_ROTATION_FROM`:
 *
 *   before  — `pool[dateToIndex]` over the FULL pool, exactly as it always was.
 *             Every past date must keep resolving to the word players actually
 *             played; their stored rounds are keyed on the date.
 *   on/after — a hash index over the pool minus its exclusions, for the lengths
 *             whose pool has been audited. The pools are frequency-ordered, so
 *             the old linear walk degraded a little more every day.
 */
export function pickDailyAnswer(date: string, length: LeksiarxeioLength): string {
  if (!usesCuratedRotation(date, length)) {
    const pool = LEKSIARXEIO_ANSWER_POOLS[length];
    if (pool.length === 0) throw new Error(`No answer pool for length ${length}`);
    return pool[dateToIndex(date, pool.length)];
  }

  const pool = playablePool(length);
  if (pool.length === 0) throw new Error(`No playable answer pool for length ${length}`);
  return pool[dateToHashIndex(date, pool.length, String(length))];
}

/**
 * Leksiarxeio's fallback answers for `date` — the one answer per length. Returned
 * as a set so a derived game can forbid every one without re-deriving the
 * indexing math or knowing the pool layout.
 */
export function getSameDayFallbackAnswers(date: string): ReadonlySet<string> {
  return new Set(
    (LEKSIARXEIO.LENGTHS as readonly LeksiarxeioLength[]).map((length) =>
      pickDailyAnswer(date, length),
    ),
  );
}

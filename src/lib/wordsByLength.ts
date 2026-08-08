// wordsByLength.ts — pure folding of per-exact-length find counts into the fixed
// display buckets for the "Λέξεις ανά μήκος" profile card (ADR 0013 lane C sibling).
//
// The read side aggregates in Postgres: player_words_by_length(device) returns one
// { length, count } row per distinct length the device has found (sparse — a length
// with no finds is simply absent). This turns that into the card's stable shape:
// every length from WORDS_MIN_TRACKED up to WORDS_TAIL_START-1 individually, then a
// single "N+" tail summing every longer find. Lengths with no finds still appear
// (count 0) so the card's rows never reflow.
//
// Only long words are tracked: player_words no longer stores finds shorter than
// WORDS_MIN_TRACKED (the shortest word-length badge — a word that long is itself a
// one-shot achievement; see achievements.ts + the /api/words floor). Both bounds are
// DERIVED from the badge-length ladder so the card, the badges, and the storage floor
// can never drift — adjust achievementTuning.wordLengthBadges, not these.

import { LEKSOKIPOS_ACHIEVEMENT_TUNING } from "@/config/achievementTuning";

const BADGE_LENGTHS = LEKSOKIPOS_ACHIEVEMENT_TUNING.wordLengthBadges;

/** Shortest tracked length — the ≥N floor for player_words (finds below it are dropped). */
export const WORDS_MIN_TRACKED = Math.min(...BADGE_LENGTHS);

/** First length folded into the "N+" tail bucket (lengths ≥ this are aggregated). */
export const WORDS_TAIL_START = Math.max(...BADGE_LENGTHS);

/** One row of the Postgres per-length aggregate. */
export interface WordLengthCount {
  length: number;
  count:  number;
}

/** One rendered bucket: a stable key, the smallest length it covers, and its count. */
export interface LengthBucket {
  /** "10"…"12" for individual lengths, "13+" for the tail. */
  key:       string;
  /** Smallest length in the bucket — the sort/identity anchor. */
  minLength: number;
  count:     number;
}

export interface WordsByLength {
  total:   number;
  buckets: LengthBucket[];
}

export function bucketWordsByLength(rows: WordLengthCount[]): WordsByLength {
  const min = WORDS_MIN_TRACKED;

  // Seed every individual bucket (min…tail-1) plus the tail, all zeroed, so the
  // card's rows are present and ordered regardless of what the device has found.
  const buckets: LengthBucket[] = [];
  for (let len = min; len < WORDS_TAIL_START; len++) {
    buckets.push({ key: String(len), minLength: len, count: 0 });
  }
  buckets.push({ key: `${WORDS_TAIL_START}+`, minLength: WORDS_TAIL_START, count: 0 });

  const tail = buckets.at(-1)!;
  let total = 0;

  for (const { length, count } of rows) {
    if (length < min) continue; // defensive: junk below the game minimum
    total += count;
    if (length >= WORDS_TAIL_START) {
      tail.count += count;
    } else {
      buckets[length - min].count += count;
    }
  }

  return { total, buckets };
}

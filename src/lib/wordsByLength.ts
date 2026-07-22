// wordsByLength.ts — pure folding of per-exact-length find counts into the fixed
// display buckets for the "Λέξεις ανά μήκος" profile card (ADR 0013 lane C sibling).
//
// The read side aggregates in Postgres: player_words_by_length(device) returns one
// { length, count } row per distinct length the device has found (sparse — a length
// with no finds is simply absent). This turns that into the card's stable shape:
// every length from MIN_WORD_LENGTH up to WORDS_TAIL_START-1 individually, then a
// single "N+" tail summing every longer find. Lengths with no finds still appear
// (count 0) so the card's rows never reflow. The starting range (4…9 + "10+") is a
// display choice, tunable against real data — adjust WORDS_TAIL_START, not callers.

import { LEKSOKIPOS } from "@/config/gameRules";

/** First length folded into the "N+" tail bucket (lengths ≥ this are aggregated). */
export const WORDS_TAIL_START = 10;

/** One row of the Postgres per-length aggregate. */
export interface WordLengthCount {
  length: number;
  count:  number;
}

/** One rendered bucket: a stable key, the smallest length it covers, and its count. */
export interface LengthBucket {
  /** "4"…"9" for individual lengths, "10+" for the tail. */
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
  const min = LEKSOKIPOS.MIN_WORD_LENGTH;

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

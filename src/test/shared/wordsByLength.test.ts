// wordsByLength.test.ts — pure folding of per-exact-length counts into the display
// buckets for the "Λέξεις ανά μήκος" profile card.
//
// The read side aggregates in Postgres (an RPC returns one { length, count } row per
// distinct length a device has found). This pure function turns that sparse,
// arbitrary-length list into the fixed bucket shape the card renders: each length
// from MIN_WORD_LENGTH up to TAIL_START-1 individually, then a single "10+" tail
// that sums every longer find. Lengths with no finds still appear (count 0) so the
// card's rows are stable; the total is the sum across every bucket.

import { describe, expect, it } from "vitest";

import { bucketWordsByLength, WORDS_TAIL_START } from "@/lib/wordsByLength";
import { LEKSOKIPOS } from "@/config/gameRules";

describe("bucketWordsByLength", () => {
  it("places each exact length in its own bucket and sums the total", () => {
    const { total, buckets } = bucketWordsByLength([
      { length: 4, count: 10 },
      { length: 5, count: 6 },
      { length: 7, count: 3 },
    ]);
    expect(total).toBe(19);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.count]));
    expect(byKey["4"]).toBe(10);
    expect(byKey["5"]).toBe(6);
    expect(byKey["6"]).toBe(0); // no 6-letter finds → present, zeroed
    expect(byKey["7"]).toBe(3);
  });

  it("folds every length at or above the tail start into the '10+' bucket", () => {
    const { total, buckets } = bucketWordsByLength([
      { length: WORDS_TAIL_START, count: 2 },
      { length: WORDS_TAIL_START + 3, count: 1 },
      { length: 4, count: 5 },
    ]);
    expect(total).toBe(8);
    const tail = buckets.find((b) => b.key === `${WORDS_TAIL_START}+`);
    expect(tail?.count).toBe(3);
  });

  it("emits one bucket per individual length plus the tail, in ascending order", () => {
    const { buckets } = bucketWordsByLength([]);
    const individual = WORDS_TAIL_START - LEKSOKIPOS.MIN_WORD_LENGTH; // 4..9 = 6
    expect(buckets).toHaveLength(individual + 1);
    expect(buckets[0].key).toBe(String(LEKSOKIPOS.MIN_WORD_LENGTH));
    expect(buckets.at(-1)!.key).toBe(`${WORDS_TAIL_START}+`);
    // Ascending minLength.
    const mins = buckets.map((b) => b.minLength);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
  });

  it("is all-zero with an empty total when the device has found nothing", () => {
    const { total, buckets } = bucketWordsByLength([]);
    expect(total).toBe(0);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("ignores lengths below the minimum (defensive — junk that slipped past capture)", () => {
    const { total, buckets } = bucketWordsByLength([
      { length: 2, count: 99 },
      { length: 4, count: 1 },
    ]);
    expect(total).toBe(1);
    expect(buckets.find((b) => b.key === "4")?.count).toBe(1);
  });
});

// wordsByLength.test.ts — pure folding of per-exact-length counts into the display
// buckets for the "Λέξεις ανά μήκος" profile card.
//
// The read side aggregates in Postgres (an RPC returns one { length, count } row per
// distinct length a device has found). This pure function turns that sparse,
// arbitrary-length list into the fixed bucket shape the card renders. Only long words
// are tracked now: each length from WORDS_MIN_TRACKED up to WORDS_TAIL_START-1
// individually (10, 11, 12), then a single "13+" tail summing every longer find.
// Lengths with no finds still appear (count 0) so the card's rows are stable; the
// total is the sum across every bucket. Finds below the floor are dropped defensively.

import { describe, expect, it } from "vitest";

import { bucketWordsByLength, WORDS_MIN_TRACKED, WORDS_TAIL_START } from "@/lib/wordsByLength";

describe("bucketWordsByLength", () => {
  it("places each exact tracked length in its own bucket and sums the total", () => {
    const { total, buckets } = bucketWordsByLength([
      { length: 10, count: 10 },
      { length: 11, count: 6 },
      { length: 12, count: 3 },
    ]);
    expect(total).toBe(19);
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b.count]));
    expect(byKey["10"]).toBe(10);
    expect(byKey["11"]).toBe(6);
    expect(byKey["12"]).toBe(3);
  });

  it("folds every length at or above the tail start into the '13+' bucket", () => {
    const { total, buckets } = bucketWordsByLength([
      { length: WORDS_TAIL_START, count: 2 },
      { length: WORDS_TAIL_START + 3, count: 1 },
      { length: 10, count: 5 },
    ]);
    expect(total).toBe(8);
    const tail = buckets.find((b) => b.key === `${WORDS_TAIL_START}+`);
    expect(tail?.count).toBe(3);
  });

  it("emits one bucket per individual tracked length plus the tail, in ascending order", () => {
    const { buckets } = bucketWordsByLength([]);
    const individual = WORDS_TAIL_START - WORDS_MIN_TRACKED; // 10..12 = 3
    expect(buckets).toHaveLength(individual + 1);
    expect(buckets[0].key).toBe(String(WORDS_MIN_TRACKED));
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

  it("ignores lengths below the tracking floor (defensive — junk that slipped past capture)", () => {
    const { total, buckets } = bucketWordsByLength([
      { length: 5, count: 99 },   // below the ≥10 floor
      { length: 10, count: 1 },
    ]);
    expect(total).toBe(1);
    expect(buckets.find((b) => b.key === "10")?.count).toBe(1);
  });

  it("puts the ≥10 floor at 10 and the tail start at 13", () => {
    // Guards the display shape against a silent tuning drift.
    expect(WORDS_MIN_TRACKED).toBe(10);
    expect(WORDS_TAIL_START).toBe(13);
  });
});

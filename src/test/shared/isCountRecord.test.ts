// isCountRecord.test.ts — the sanitizer guarding the client-supplied `data` blob
// before it lands in the public-read game_scores.data jsonb (issue 10).

import { describe, expect, it } from "vitest";

import { isCountRecord } from "@/app/api/game-scores/route";

describe("isCountRecord", () => {
  it("accepts a flat record of finite numbers", () => {
    expect(isCountRecord({ words: 12, pangrams: 2 })).toBe(true);
  });

  it("accepts zero counts", () => {
    expect(isCountRecord({ words: 0, pangrams: 0 })).toBe(true);
  });

  it("rejects an empty object", () => {
    expect(isCountRecord({})).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isCountRecord(null)).toBe(false);
    expect(isCountRecord(undefined)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(isCountRecord([1, 2, 3])).toBe(false);
  });

  it("rejects a string value (e.g. smuggled word list)", () => {
    expect(isCountRecord({ words: 12, cheat: "ΑΠΟΛΥΤΟΤΗΤΑ" })).toBe(false);
  });

  it("rejects nested objects", () => {
    expect(isCountRecord({ words: { count: 12 } })).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(isCountRecord({ words: NaN })).toBe(false);
    expect(isCountRecord({ words: Infinity })).toBe(false);
  });
});

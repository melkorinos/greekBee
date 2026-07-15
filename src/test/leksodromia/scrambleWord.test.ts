// scrambleWord.test.ts — deterministic scramble for Leksodromia.
// Same (word, seed) → same scramble for every player (fair leaderboard).
// The scramble is a permutation of the word's letters and is never the
// identity order — the puzzle must never present the answer pre-solved.

import { describe, expect, it } from "vitest";

import { getAnswerPool } from "@/data/leksiarxeio";
import { scrambleWord } from "@/games/leksodromia/lib/scrambleWord";

const sortLetters = (w: string) => [...w].sort().join("");

describe("scrambleWord", () => {
  it("is deterministic — same word and seed give the same scramble", () => {
    expect(scrambleWord("καλημερα", "2026-07-13")).toBe(
      scrambleWord("καλημερα", "2026-07-13"),
    );
  });

  it("preserves the letter multiset", () => {
    const word = "γραμματα";
    const scrambled = scrambleWord(word, "2026-07-13");
    expect(sortLetters(scrambled)).toBe(sortLetters(word));
  });

  it("is never the identity order — across real pool words and many seeds", () => {
    const words = [
      ...getAnswerPool(4).slice(0, 40),
      ...getAnswerPool(6).slice(0, 40),
      ...getAnswerPool(8).slice(0, 40),
    ];
    for (const word of words) {
      for (const seed of ["2026-01-01", "2026-07-13", "2027-12-31"]) {
        expect(scrambleWord(word, seed)).not.toBe(word);
      }
    }
  });

  it("escapes the identity even when repeated letters make it likely", () => {
    expect(scrambleWord("αβαβ", "seed-a")).not.toBe("αβαβ");
    expect(scrambleWord("αα1β", "seed-b")).not.toBe("αα1β");
  });

  it("different seeds produce different orders over a sample", () => {
    const seeds = Array.from({ length: 10 }, (_, i) => `2026-07-${10 + i}`);
    const variants = new Set(seeds.map((s) => scrambleWord("καλημερα", s)));
    expect(variants.size).toBeGreaterThan(1);
  });

  it("returns a word of indistinguishable letters unchanged (no non-identity order exists)", () => {
    expect(scrambleWord("αααα", "any")).toBe("αααα");
  });
});

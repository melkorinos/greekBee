// Leksoplegma generator core — offline puzzle construction (the CLI script is
// a thin wrapper around these pure functions). Constraint checks per the spec:
// 9 required words, 16 tiles all covered, 8-dir adjacency, no crossing-diagonal
// pair, letters/paths consistency, and bonus enumeration on a fixture board.

import { describe, it, expect } from "vitest";

import { LEKSOPLEGMA } from "@/config/gameRules";
import { hashSeed, mulberry32 } from "@/games/leksodromia/lib/seededRandom";
import {
  BONUS_MIN_LENGTH,
  enumerateBonusWords,
  generatePuzzle,
  validatePuzzle,
} from "@/games/leksoplegma/lib/generator";

import answers4 from "@/data/leksiarxeio/answers-4.json";
import answers5 from "@/data/leksiarxeio/answers-5.json";
import answers6 from "@/data/leksiarxeio/answers-6.json";
import answers7 from "@/data/leksiarxeio/answers-7.json";
import answers8 from "@/data/leksiarxeio/answers-8.json";

const POOLS = {
  4: answers4 as string[],
  5: answers5 as string[],
  6: answers6 as string[],
  7: answers7 as string[],
  8: answers8 as string[],
};

function generate(seed: string, dict: readonly string[] = []) {
  return generatePuzzle({ id: `test-${seed}`, rand: mulberry32(hashSeed(seed)), pools: POOLS, dict });
}

describe("enumerateBonusWords — fixture board", () => {
  // Tiles: 0=κ 1=α 2=λ 3=μ 4=ο. Required paths draw edges 0-1, 1-2, 2-4, 3-4.
  const letters = "καλμο";
  const paths = { καλο: [0, 1, 2, 4], μολα: [3, 4, 2, 1] };
  const dict = [
    "λακ",  // traceable: 2-1, 1-0
    "αλο",  // traceable: 1-2, 2-4
    "κολ",  // κ-ο edge never drawn — NOT traceable
    "ολμ",  // λ-μ edge never drawn — NOT traceable
    "αμ",   // below BONUS_MIN_LENGTH
    "καλο", // required word — excluded even though traceable
    "ζεστη", // letters not on the board
  ];

  it("returns exactly the traceable dictionary words, minus required, sorted", () => {
    expect(enumerateBonusWords(letters, paths, dict)).toEqual(["αλο", "λακ"]);
  });

  it("enforces a minimum bonus length of 3", () => {
    expect(BONUS_MIN_LENGTH).toBe(3);
    expect(enumerateBonusWords(letters, paths, ["αμ", "λακ"])).toEqual(["λακ"]);
  });

  it("dedupes words traceable along multiple routes", () => {
    const out = enumerateBonusWords(letters, paths, ["αλο", "αλο"]);
    expect(out).toEqual(["αλο"]);
  });
});

describe("generatePuzzle — real answer pools", () => {
  const puzzle = generate("leksoplegma-test-seed-1");

  it("produces a puzzle from the curated pools", () => {
    expect(puzzle).not.toBeNull();
  });

  it("satisfies every board constraint (validatePuzzle finds no violations)", () => {
    expect(validatePuzzle(puzzle!)).toEqual([]);
  });

  it("has exactly REQUIRED_WORDS distinct required words with a long anchor", () => {
    const words = Object.keys(puzzle!.paths);
    expect(words).toHaveLength(LEKSOPLEGMA.REQUIRED_WORDS);
    expect(new Set(words).size).toBe(words.length);
    expect(words.some((w) => w.length >= 7)).toBe(true);
  });

  it("covers all 16 tiles with required paths (board ends empty)", () => {
    const covered = new Set(Object.values(puzzle!.paths).flat());
    expect(covered.size).toBe(LEKSOPLEGMA.GRID_SIZE);
  });

  it("is deterministic for a given seed", () => {
    expect(generate("leksoplegma-test-seed-1")).toEqual(puzzle);
  });

  it("produces different boards for different seeds", () => {
    expect(generate("leksoplegma-test-seed-2")).not.toEqual(puzzle);
  });
});

describe("validatePuzzle — violation detection", () => {
  const good = generate("leksoplegma-test-seed-1")!;

  it("flags a letters/path mismatch", () => {
    const firstWord = Object.keys(good.paths)[0];
    const tile = good.paths[firstWord][0];
    const corrupted = {
      ...good,
      letters:
        good.letters.slice(0, tile) +
        (good.letters[tile] === "ω" ? "ψ" : "ω") +
        good.letters.slice(tile + 1),
    };
    expect(validatePuzzle(corrupted)).not.toEqual([]);
  });

  it("flags a non-adjacent path step", () => {
    const firstWord = Object.keys(good.paths)[0];
    const badPath = [...good.paths[firstWord]];
    // 0 and 15 are opposite corners of the 4×4 — never adjacent
    badPath[0] = badPath[1] === 0 ? 15 : 0;
    const corrupted = { ...good, paths: { ...good.paths, [firstWord]: badPath } };
    expect(validatePuzzle(corrupted)).not.toEqual([]);
  });

  it("flags an untraceable bonus word", () => {
    const corrupted = { ...good, bonusWords: ["ζζζζ"] };
    expect(validatePuzzle(corrupted)).not.toEqual([]);
  });
});

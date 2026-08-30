// Unit tests for scoreLeksiarxeio and buildLetterStateMap.

import { describe, expect, it } from "vitest";

import type { GuessResult } from "@/games/leksiarxeio/types";
import { buildLetterStateMap } from "@/games/leksiarxeio/lib/letterState";
import { scoreLeksiarxeio } from "@/games/leksiarxeio/lib/scoring";

describe("scoreLeksiarxeio", () => {
  it("returns 6 for 1 guess", () => expect(scoreLeksiarxeio(1, true)).toBe(6));
  it("returns 5 for 2 guesses", () => expect(scoreLeksiarxeio(2, true)).toBe(5));
  it("returns 1 for 6 guesses", () => expect(scoreLeksiarxeio(6, true)).toBe(1));
  it("returns 0 for a loss", () => expect(scoreLeksiarxeio(6, false)).toBe(0));
});

describe("buildLetterStateMap", () => {
  const guesses: GuessResult[] = [
    { word: "αβγδε", tiles: ["correct", "absent", "present", "absent", "absent"] },
    { word: "αζγηθ", tiles: ["correct", "present", "correct", "absent", "absent"] },
  ];

  it("α is correct", () => {
    expect(buildLetterStateMap(guesses)["α"]).toBe("correct");
  });

  it("β is absent", () => {
    expect(buildLetterStateMap(guesses)["β"]).toBe("absent");
  });

  it("γ: correct beats present from earlier guess", () => {
    expect(buildLetterStateMap(guesses)["γ"]).toBe("correct");
  });

  it("ζ is present", () => {
    expect(buildLetterStateMap(guesses)["ζ"]).toBe("present");
  });

  it("unknown letter returns undefined", () => {
    expect(buildLetterStateMap(guesses)["ω"]).toBeUndefined();
  });
});

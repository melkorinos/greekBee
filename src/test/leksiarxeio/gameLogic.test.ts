// Unit tests for buildLetterStateMap.

import { describe, expect, it } from "vitest";

import type { GuessResult } from "@/games/leksiarxeio/types";
import { buildLetterStateMap } from "@/games/leksiarxeio/lib/letterState";

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

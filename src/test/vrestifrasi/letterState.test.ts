import { describe, it, expect } from "vitest";
import { buildPhraseLetterStateMap } from "@/games/vrestifrasi/lib/letterState";
import type { PhraseGuessResult } from "@/games/vrestifrasi/types";

function makeGuess(words: string[], tiles: string[][]): PhraseGuessResult {
  return { words, tiles: tiles as PhraseGuessResult["tiles"] };
}

describe("buildPhraseLetterStateMap", () => {
  it("returns empty map for no guesses", () => {
    expect(buildPhraseLetterStateMap([])).toEqual({});
  });

  it("maps each letter to its tile state", () => {
    const guess = makeGuess(["αβγ"], [["correct", "present", "absent"]]);
    const map = buildPhraseLetterStateMap([guess]);
    expect(map["α"]).toBe("correct");
    expect(map["β"]).toBe("present");
    expect(map["γ"]).toBe("absent");
  });

  it("correct beats present beats misplaced-word beats absent", () => {
    const g1 = makeGuess(["α"], [["absent"]]);
    const g2 = makeGuess(["α"], [["misplaced-word"]]);
    const g3 = makeGuess(["α"], [["present"]]);
    const g4 = makeGuess(["α"], [["correct"]]);
    const map = buildPhraseLetterStateMap([g1, g2, g3, g4]);
    expect(map["α"]).toBe("correct");
  });

  it("misplaced-word beats absent", () => {
    const g1 = makeGuess(["α"], [["absent"]]);
    const g2 = makeGuess(["α"], [["misplaced-word"]]);
    const map = buildPhraseLetterStateMap([g1, g2]);
    expect(map["α"]).toBe("misplaced-word");
  });

  it("present beats misplaced-word", () => {
    const g1 = makeGuess(["α"], [["misplaced-word"]]);
    const g2 = makeGuess(["α"], [["present"]]);
    const map = buildPhraseLetterStateMap([g1, g2]);
    expect(map["α"]).toBe("present");
  });

  it("never downgrades a state", () => {
    const g1 = makeGuess(["α"], [["correct"]]);
    const g2 = makeGuess(["α"], [["absent"]]);
    const map = buildPhraseLetterStateMap([g1, g2]);
    expect(map["α"]).toBe("correct");
  });

  it("aggregates across multiple words in one guess", () => {
    const guess = makeGuess(["αβ", "γδ"], [["correct", "absent"], ["misplaced-word", "present"]]);
    const map = buildPhraseLetterStateMap([guess]);
    expect(map["α"]).toBe("correct");
    expect(map["β"]).toBe("absent");
    expect(map["γ"]).toBe("misplaced-word");
    expect(map["δ"]).toBe("present");
  });
});

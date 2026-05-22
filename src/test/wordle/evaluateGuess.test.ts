// Unit tests for evaluateGuess — the core Wordle algorithm.
// Covers: exact matches, present letters, absent, and duplicate-letter edge cases.

import { describe, expect, it } from "vitest";

import { evaluateGuess } from "@/games/wordle/lib/evaluateGuess";

describe("evaluateGuess", () => {
  it("marks all correct when guess === answer", () => {
    expect(evaluateGuess("αβγδε", "αβγδε")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ]);
  });

  it("marks all absent when no letters match", () => {
    expect(evaluateGuess("αβγδε", "ζηθικ")).toEqual([
      "absent", "absent", "absent", "absent", "absent",
    ]);
  });

  it("marks present for correct letter in wrong position", () => {
    // answer: "αβγδε", guess has α in position 4
    const result = evaluateGuess("βγδεα", "αβγδε");
    // β→present, γ→present, δ→present, ε→present, α→present
    expect(result).toEqual([
      "present", "present", "present", "present", "present",
    ]);
  });

  it("handles mixed correct + present + absent", () => {
    // answer: "αβγδε"
    // guess:  "αζγζε" → α=correct, ζ=absent, γ=correct, ζ=absent, ε=correct
    const result = evaluateGuess("αζγζε", "αβγδε");
    expect(result).toEqual(["correct", "absent", "correct", "absent", "correct"]);
  });

  it("does not double-count duplicate answer letters", () => {
    // answer: "αβαγδ" (α appears at positions 0 and 2)
    // guess:  "αααζε"
    //   pos 0: α=α → correct  (consumes answer[0])
    //   pos 2: α=α → correct  (consumes answer[2])
    //   pos 1: α — no more α remaining in answer → absent
    //   pos 3: ζ not in answer → absent
    //   pos 4: ε not in answer → absent
    const result = evaluateGuess("αααζε", "αβαγδ");
    expect(result[0]).toBe("correct");  // pos 0: exact match
    expect(result[1]).toBe("absent");   // no remaining α after two exact matches
    expect(result[2]).toBe("correct");  // pos 2: exact match
    expect(result[3]).toBe("absent");   // ζ not in answer
    expect(result[4]).toBe("absent");   // ε not in answer
  });

  it("does not double-count duplicate guess letters against a single answer letter", () => {
    // answer has only one α; guess has α in both pos 0 and pos 1
    // answer: "αβγδε" — α only at position 0
    // guess:  "ααζζζ" → pos0=correct, pos1=absent (α already consumed), rest absent
    const result = evaluateGuess("ααζζζ", "αβγδε");
    expect(result[0]).toBe("correct");
    expect(result[1]).toBe("absent");
    expect(result[2]).toBe("absent");
  });

  it("returns the right length", () => {
    expect(evaluateGuess("αβγδε", "αβγδε")).toHaveLength(5);
  });
});

// scoring.test.ts — Topothesies score = shape points + capital bonus.
// Points scale with guesses remaining at the moment of the correct guess; the
// numeric knobs come from gameRules (imported, never hardcoded). Expected values
// are computed from the spec formula independently of computeScore.

import { describe, expect, it } from "vitest";

import { TOPOTHESIES } from "@/config/gameRules";
import type {
  CapitalGuessRecord,
  ShapeGuessRecord,
  TopothesiesState,
} from "@/games/topothesies/types";
import { computeScore } from "@/games/topothesies/lib/scoring";

const {
  SHAPE_GUESSES,
  CAPITAL_GUESSES,
  POINTS_PER_SHAPE_GUESS_LEFT,
  POINTS_PER_CAPITAL_GUESS_LEFT,
} = TOPOTHESIES;

const wrongShape: ShapeGuessRecord = { guessId: "x", correct: false, hint: null };
const rightShape: ShapeGuessRecord = { guessId: "t", correct: true, hint: null };
const wrongCap: CapitalGuessRecord = { guessNormalized: "x", correct: false, hint: null };
const rightCap: CapitalGuessRecord = { guessNormalized: "t", correct: true, hint: null };

function state(over: Partial<TopothesiesState>): TopothesiesState {
  return {
    puzzleId: "t",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: {} as any,
    answers: [],
    maxKm: 500,
    stage: "finished",
    shapeGuesses: [],
    capitalGuesses: [],
    shapeSolved: false,
    shapeFailed: false,
    capitalSolved: false,
    capitalFailed: false,
    ...over,
  };
}

describe("computeScore", () => {
  it("awards full shape points for a first-try solve", () => {
    const s = state({ shapeSolved: true, shapeGuesses: [rightShape] });
    expect(computeScore(s)).toBe(POINTS_PER_SHAPE_GUESS_LEFT * SHAPE_GUESSES);
  });

  it("scales shape points down with each wrong guess before the solve", () => {
    const s = state({
      shapeSolved: true,
      shapeGuesses: [wrongShape, wrongShape, wrongShape, rightShape], // solved 4th
    });
    expect(computeScore(s)).toBe(POINTS_PER_SHAPE_GUESS_LEFT * (SHAPE_GUESSES - 3));
  });

  it("awards zero when the shape stage failed", () => {
    const s = state({
      shapeFailed: true,
      shapeGuesses: [wrongShape, wrongShape, wrongShape, wrongShape],
    });
    expect(computeScore(s)).toBe(0);
  });

  it("adds the full capital bonus for a first-try capital solve", () => {
    const s = state({
      shapeSolved: true,
      shapeGuesses: [rightShape],
      capitalSolved: true,
      capitalGuesses: [rightCap],
    });
    expect(computeScore(s)).toBe(
      POINTS_PER_SHAPE_GUESS_LEFT * SHAPE_GUESSES +
        POINTS_PER_CAPITAL_GUESS_LEFT * CAPITAL_GUESSES,
    );
  });

  it("scales the capital bonus down with each wrong capital guess", () => {
    const s = state({
      shapeSolved: true,
      shapeGuesses: [rightShape],
      capitalSolved: true,
      capitalGuesses: [wrongCap, wrongCap, rightCap], // solved 3rd
    });
    expect(computeScore(s)).toBe(
      POINTS_PER_SHAPE_GUESS_LEFT * SHAPE_GUESSES +
        POINTS_PER_CAPITAL_GUESS_LEFT * (CAPITAL_GUESSES - 2),
    );
  });

  it("adds no capital bonus when the capital stage failed", () => {
    const s = state({
      shapeSolved: true,
      shapeGuesses: [rightShape],
      capitalFailed: true,
      capitalGuesses: [wrongCap, wrongCap, wrongCap],
    });
    expect(computeScore(s)).toBe(POINTS_PER_SHAPE_GUESS_LEFT * SHAPE_GUESSES);
  });

  it("can award a capital bonus even when the shape stage failed (educational path)", () => {
    const s = state({
      shapeFailed: true,
      shapeGuesses: [wrongShape, wrongShape, wrongShape, wrongShape],
      capitalSolved: true,
      capitalGuesses: [rightCap],
    });
    expect(computeScore(s)).toBe(POINTS_PER_CAPITAL_GUESS_LEFT * CAPITAL_GUESSES);
  });
});

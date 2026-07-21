// topothesiesReducer.test.ts — the single state-machine seam (pure).
// Two stages: 4 shape guesses → 3 capital guesses (bonus). A wrong guess is
// only consumed if it is a VALID (autocomplete-resolvable) guess; typos no-op.
// A failed shape stage still enters the capital stage (educational path). The
// reducer never reads Date.now() or touches geometry.

import { describe, expect, it } from "vitest";

import { TOPOTHESIES } from "@/config/gameRules";
import type { TopothesiesAnswer } from "@/games/topothesies/types";
import {
  makeInitialTopothesiesState,
  topothesiesReducer,
} from "@/games/topothesies/lib/topothesiesReducer";

const MAX_KM = 500;

function mk(partial: Partial<TopothesiesAnswer> & { id: string }): TopothesiesAnswer {
  return {
    name: partial.id,
    nameNormalized: partial.id,
    capital: partial.id,
    capitalNormalized: partial.id,
    capitalCoord: [24, 39],
    centroid: [24, 39],
    aliases: [],
    region: "region",
    isIsland: false,
    ...partial,
  };
}

const TARGET = mk({
  id: "naxos",
  name: "Νάξος",
  nameNormalized: "ναξοσ",
  capital: "Χώρα",
  capitalNormalized: "χωρα",
  capitalCoord: [25.5, 37.1],
  centroid: [25.5, 37.1],
});
const MILOS = mk({
  id: "milos",
  name: "Μήλος",
  nameNormalized: "μηλοσ",
  capital: "Πλάκα",
  capitalNormalized: "πλακα",
  capitalCoord: [24.42, 36.74],
  centroid: [24.42, 36.74],
});
const KEA = mk({
  id: "kea",
  name: "Κέα",
  nameNormalized: "κεα",
  capital: "Ιουλίδα",
  capitalNormalized: "ιουλιδα",
  capitalCoord: [24.33, 37.66],
  centroid: [24.33, 37.66],
});
const ANSWERS = [TARGET, MILOS, KEA];

const init = () => makeInitialTopothesiesState(TARGET, ANSWERS, MAX_KM);

describe("makeInitialTopothesiesState", () => {
  it("starts in the shape stage with empty history and no flags set", () => {
    const s = init();
    expect(s.stage).toBe("shape");
    expect(s.puzzleId).toBe("naxos");
    expect(s.shapeGuesses).toEqual([]);
    expect(s.capitalGuesses).toEqual([]);
    expect(s.shapeSolved).toBe(false);
    expect(s.shapeFailed).toBe(false);
    expect(s.capitalSolved).toBe(false);
    expect(s.capitalFailed).toBe(false);
  });
});

describe("shape stage", () => {
  it("solves on a correct guess and advances to the capital stage", () => {
    const s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Νάξος" });
    expect(s.shapeSolved).toBe(true);
    expect(s.stage).toBe("capital");
    expect(s.shapeGuesses).toHaveLength(1);
    expect(s.shapeGuesses[0].correct).toBe(true);
    expect(s.shapeGuesses[0].hint).toBeNull();
  });

  it("records a wrong guess with a hint and stays in the shape stage", () => {
    const s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Μήλος" });
    expect(s.shapeSolved).toBe(false);
    expect(s.stage).toBe("shape");
    expect(s.shapeGuesses).toHaveLength(1);
    expect(s.shapeGuesses[0].correct).toBe(false);
    expect(s.shapeGuesses[0].hint).not.toBeNull();
    expect(s.shapeGuesses[0].hint!.arrow).toMatch(/[↑↗→↘↓↙←↖]/);
  });

  it("fails after all shape guesses are exhausted, but still enters the capital stage", () => {
    let s = init();
    for (let i = 0; i < TOPOTHESIES.SHAPE_GUESSES; i++) {
      s = topothesiesReducer(s, { type: "GUESS_SHAPE", text: "Μήλος" });
    }
    expect(s.shapeGuesses).toHaveLength(TOPOTHESIES.SHAPE_GUESSES);
    expect(s.shapeSolved).toBe(false);
    expect(s.shapeFailed).toBe(true);
    expect(s.stage).toBe("capital");
  });

  it("ignores an unresolvable (typo) guess — no guess consumed", () => {
    const s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Ατλαντίδα" });
    expect(s.shapeGuesses).toHaveLength(0);
    expect(s.stage).toBe("shape");
  });

  it("ignores capital guesses while still in the shape stage", () => {
    const s = topothesiesReducer(init(), { type: "GUESS_CAPITAL", text: "Χώρα" });
    expect(s.capitalGuesses).toHaveLength(0);
    expect(s.stage).toBe("shape");
  });
});

describe("capital stage", () => {
  const solvedShape = () =>
    topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Νάξος" });

  it("finishes on a correct capital guess", () => {
    const s = topothesiesReducer(solvedShape(), { type: "GUESS_CAPITAL", text: "Χώρα" });
    expect(s.capitalSolved).toBe(true);
    expect(s.stage).toBe("finished");
    expect(s.capitalGuesses[0].correct).toBe(true);
    expect(s.capitalGuesses[0].hint).toBeNull();
  });

  it("records a wrong-but-known capital with a hint and stays in the capital stage", () => {
    const s = topothesiesReducer(solvedShape(), { type: "GUESS_CAPITAL", text: "Πλάκα" });
    expect(s.capitalGuesses).toHaveLength(1);
    expect(s.capitalGuesses[0].correct).toBe(false);
    expect(s.capitalGuesses[0].hint).not.toBeNull();
    expect(s.stage).toBe("capital");
  });

  it("ignores an unknown capital (not a candidate) — no guess consumed", () => {
    const s = topothesiesReducer(solvedShape(), { type: "GUESS_CAPITAL", text: "Ουτοπία" });
    expect(s.capitalGuesses).toHaveLength(0);
    expect(s.stage).toBe("capital");
  });

  it("fails and finishes after all capital guesses are exhausted", () => {
    let s = solvedShape();
    for (let i = 0; i < TOPOTHESIES.CAPITAL_GUESSES; i++) {
      s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Πλάκα" });
    }
    expect(s.capitalGuesses).toHaveLength(TOPOTHESIES.CAPITAL_GUESSES);
    expect(s.capitalSolved).toBe(false);
    expect(s.capitalFailed).toBe(true);
    expect(s.stage).toBe("finished");
  });

  it("still allows the capital stage after a failed shape stage", () => {
    let s = init();
    for (let i = 0; i < TOPOTHESIES.SHAPE_GUESSES; i++) {
      s = topothesiesReducer(s, { type: "GUESS_SHAPE", text: "Μήλος" });
    }
    expect(s.stage).toBe("capital");
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" });
    expect(s.capitalSolved).toBe(true);
    expect(s.stage).toBe("finished");
  });
});

describe("finished state is inert", () => {
  it("ignores further guesses once finished", () => {
    let s = topothesiesReducer(init(), { type: "GUESS_SHAPE", text: "Νάξος" });
    s = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Χώρα" });
    expect(s.stage).toBe("finished");
    const after = topothesiesReducer(s, { type: "GUESS_CAPITAL", text: "Πλάκα" });
    expect(after).toBe(s); // untouched reference — no-op
  });
});

describe("RESTORE_STATE", () => {
  it("rebuilds stage and flags from a saved guess history", () => {
    // Replay two wrong shapes + a solve, then a wrong capital, into a fresh state.
    let live = init();
    live = topothesiesReducer(live, { type: "GUESS_SHAPE", text: "Μήλος" });
    live = topothesiesReducer(live, { type: "GUESS_SHAPE", text: "Νάξος" });
    live = topothesiesReducer(live, { type: "GUESS_CAPITAL", text: "Πλάκα" });

    const restored = topothesiesReducer(init(), {
      type: "RESTORE_STATE",
      shapeGuesses: live.shapeGuesses,
      capitalGuesses: live.capitalGuesses,
    });
    expect(restored.shapeSolved).toBe(true);
    expect(restored.stage).toBe("capital");
    expect(restored.shapeGuesses).toHaveLength(2);
    expect(restored.capitalGuesses).toHaveLength(1);
  });
});

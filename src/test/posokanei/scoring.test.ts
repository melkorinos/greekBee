import { describe, expect, it } from "vitest";

import { POSOKANEI } from "@/config/gameRules";
import { makeInitialPosokaneiState, posokaneiReducer } from "@/games/posokanei/lib/posokaneiReducer";
import { computeScore } from "@/games/posokanei/lib/scoring";
import type { PosokaneiPuzzle } from "@/games/posokanei/types";

const TARGET: PosokaneiPuzzle = {
  date: "2026-08-01", item: "Αγγούρι", itemType: "generic", unit: "τεμ",
  price: 2.0, band: 0.1, photo: "/x.svg", photoSource: "x", photoLicense: "x",
  sourceStore: "x", sourceDate: "2026-08-01",
};

describe("computeScore", () => {
  it("awards full points for a first-guess solve", () => {
    const s = posokaneiReducer(makeInitialPosokaneiState(TARGET), { type: "GUESS", value: 2.0 });
    expect(computeScore(s)).toBe(POSOKANEI.POINTS_PER_GUESS_LEFT * POSOKANEI.MAX_GUESSES);
  });

  it("deducts one step per earlier wrong guess", () => {
    let s = makeInitialPosokaneiState(TARGET);
    s = posokaneiReducer(s, { type: "GUESS", value: 1.0 }); // wrong
    s = posokaneiReducer(s, { type: "GUESS", value: 2.0 }); // correct on 2nd
    expect(computeScore(s)).toBe(POSOKANEI.POINTS_PER_GUESS_LEFT * (POSOKANEI.MAX_GUESSES - 1));
  });

  it("scores zero for an unsolved round", () => {
    let s = makeInitialPosokaneiState(TARGET);
    for (let i = 0; i < POSOKANEI.MAX_GUESSES; i++) s = posokaneiReducer(s, { type: "GUESS", value: 100 });
    expect(computeScore(s)).toBe(0);
  });

  it("scores zero after giving up", () => {
    const s = posokaneiReducer(makeInitialPosokaneiState(TARGET), { type: "GIVE_UP" });
    expect(computeScore(s)).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import { LOGOPAIGNIO } from "@/config/gameRules";
import {
  logopaignioReducer,
  makeInitialLogopaignioState,
} from "@/games/logopaignio/lib/logopaignioReducer";
import { computeScore } from "@/games/logopaignio/lib/scoring";
import type { LogopaignioPuzzle } from "@/games/logopaignio/types";

const TARGET: LogopaignioPuzzle = {
  id: "cosmote", brand: "Cosmote", sector: "Τηλεπικοινωνίες",
  accept: ["Cosmote"], markAsset: "/x.svg",
};

describe("computeScore", () => {
  it("awards full points for a first-guess (fully blurred) solve", () => {
    const s = logopaignioReducer(makeInitialLogopaignioState(TARGET), { type: "GUESS", input: "Cosmote" });
    expect(computeScore(s)).toBe(LOGOPAIGNIO.POINTS_PER_GUESS_LEFT * LOGOPAIGNIO.MAX_GUESSES);
  });

  it("deducts one step per earlier wrong guess (per reveal step)", () => {
    let s = makeInitialLogopaignioState(TARGET);
    s = logopaignioReducer(s, { type: "GUESS", input: "wrong" });    // one reveal
    s = logopaignioReducer(s, { type: "GUESS", input: "Cosmote" });  // solved on 2nd
    expect(computeScore(s)).toBe(LOGOPAIGNIO.POINTS_PER_GUESS_LEFT * (LOGOPAIGNIO.MAX_GUESSES - 1));
  });

  it("scores zero for an unsolved round", () => {
    let s = makeInitialLogopaignioState(TARGET);
    for (let i = 0; i < LOGOPAIGNIO.MAX_GUESSES; i++) s = logopaignioReducer(s, { type: "GUESS", input: "wrong" });
    expect(computeScore(s)).toBe(0);
  });

  it("scores zero after giving up", () => {
    const s = logopaignioReducer(makeInitialLogopaignioState(TARGET), { type: "GIVE_UP" });
    expect(computeScore(s)).toBe(0);
  });
});

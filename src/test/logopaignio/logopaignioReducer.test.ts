import { describe, expect, it } from "vitest";

import { LOGOPAIGNIO } from "@/config/gameRules";
import {
  logopaignioReducer,
  makeInitialLogopaignioState,
  type LogopaignioAction,
} from "@/games/logopaignio/lib/logopaignioReducer";
import type { LogopaignioPuzzle, LogopaignioState } from "@/games/logopaignio/types";

const TARGET: LogopaignioPuzzle = {
  id: "cosmote", brand: "Cosmote", sector: "Τηλεπικοινωνίες",
  accept: ["Cosmote", "Κοσμοτε"], markAsset: "/x.svg",
};

const fresh = () => makeInitialLogopaignioState(TARGET);
const run = (state: LogopaignioState, ...actions: LogopaignioAction[]) =>
  actions.reduce(logopaignioReducer, state);

describe("logopaignioReducer", () => {
  it("starts guessing with an empty history, keyed by the puzzle id", () => {
    const s = fresh();
    expect(s.stage).toBe("guessing");
    expect(s.guesses).toEqual([]);
    expect(s.puzzleId).toBe("cosmote");
  });

  it("records a wrong guess and stays guessing", () => {
    const s = run(fresh(), { type: "GUESS", input: "Vodafone" });
    expect(s.guesses).toEqual([{ input: "Vodafone", correct: false }]);
    expect(s.stage).toBe("guessing");
  });

  it("solves and finishes on a correct guess (any accepted spelling)", () => {
    const s = run(fresh(), { type: "GUESS", input: "κοσμοτε" });
    expect(s.solved).toBe(true);
    expect(s.stage).toBe("finished");
  });

  it("ignores empty / whitespace-only guesses without consuming a turn", () => {
    const s = run(fresh(), { type: "GUESS", input: "" }, { type: "GUESS", input: "   " });
    expect(s.guesses).toHaveLength(0);
    expect(s.stage).toBe("guessing");
  });

  it("fails after MAX_GUESSES wrong guesses", () => {
    let s = fresh();
    for (let i = 0; i < LOGOPAIGNIO.MAX_GUESSES; i++) s = logopaignioReducer(s, { type: "GUESS", input: "wrong" });
    expect(s.guesses).toHaveLength(LOGOPAIGNIO.MAX_GUESSES);
    expect(s.failed).toBe(true);
    expect(s.solved).toBe(false);
    expect(s.stage).toBe("finished");
  });

  it("ignores guesses once the round is finished", () => {
    const solved = run(fresh(), { type: "GUESS", input: "Cosmote" });
    const after = logopaignioReducer(solved, { type: "GUESS", input: "again" });
    expect(after).toBe(solved);
  });

  it("GIVE_UP forces a finished, failed round", () => {
    const s = run(fresh(), { type: "GUESS", input: "wrong" }, { type: "GIVE_UP" });
    expect(s.gaveUp).toBe(true);
    expect(s.failed).toBe(true);
    expect(s.stage).toBe("finished");
  });

  it("RESTORE_STATE replays a saved history through the same derivation", () => {
    const played = run(fresh(), { type: "GUESS", input: "wrong" }, { type: "GUESS", input: "Cosmote" });
    const restored = logopaignioReducer(fresh(), {
      type: "RESTORE_STATE",
      guesses: played.guesses,
      gaveUp: false,
    });
    expect(restored.solved).toBe(true);
    expect(restored.stage).toBe("finished");
    expect(restored.guesses).toEqual(played.guesses);
  });

  it("RESTORE_STATE replays a given-up round", () => {
    const restored = logopaignioReducer(fresh(), { type: "RESTORE_STATE", guesses: [], gaveUp: true });
    expect(restored.gaveUp).toBe(true);
    expect(restored.failed).toBe(true);
    expect(restored.stage).toBe("finished");
  });
});

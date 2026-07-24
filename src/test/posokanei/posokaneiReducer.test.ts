import { describe, expect, it } from "vitest";

import { POSOKANEI } from "@/config/gameRules";
import {
  makeInitialPosokaneiState,
  posokaneiReducer,
  type PosokaneiAction,
} from "@/games/posokanei/lib/posokaneiReducer";
import type { PosokaneiPuzzle, PosokaneiState } from "@/games/posokanei/types";

const TARGET: PosokaneiPuzzle = {
  date: "2026-08-01", item: "Αγγούρι", itemType: "generic", unit: "τεμ",
  price: 2.0, band: 0.1, photo: "/x.svg", photoSource: "x", photoLicense: "x",
  sourceStore: "x", sourceDate: "2026-08-01",
};

const fresh = () => makeInitialPosokaneiState(TARGET);
const run = (state: PosokaneiState, ...actions: PosokaneiAction[]) =>
  actions.reduce(posokaneiReducer, state);

describe("posokaneiReducer", () => {
  it("starts guessing with an empty history", () => {
    const s = fresh();
    expect(s.stage).toBe("guessing");
    expect(s.guesses).toEqual([]);
    expect(s.puzzleId).toBe("2026-08-01");
  });

  it("records a wrong guess with its direction and stays guessing", () => {
    const s = run(fresh(), { type: "GUESS", value: 1.0 });
    expect(s.guesses).toHaveLength(1);
    expect(s.guesses[0]).toMatchObject({ value: 1.0, correct: false, direction: "higher" });
    expect(s.stage).toBe("guessing");
  });

  it("solves and finishes when a guess lands in the band", () => {
    const s = run(fresh(), { type: "GUESS", value: 2.05 });
    expect(s.solved).toBe(true);
    expect(s.stage).toBe("finished");
  });

  it("ignores invalid guesses (non-positive / NaN) without consuming a turn", () => {
    const s = run(fresh(),
      { type: "GUESS", value: 0 },
      { type: "GUESS", value: -3 },
      { type: "GUESS", value: NaN },
    );
    expect(s.guesses).toHaveLength(0);
    expect(s.stage).toBe("guessing");
  });

  it("fails after MAX_GUESSES wrong guesses", () => {
    let s = fresh();
    for (let i = 0; i < POSOKANEI.MAX_GUESSES; i++) s = posokaneiReducer(s, { type: "GUESS", value: 100 });
    expect(s.guesses).toHaveLength(POSOKANEI.MAX_GUESSES);
    expect(s.failed).toBe(true);
    expect(s.solved).toBe(false);
    expect(s.stage).toBe("finished");
  });

  it("ignores guesses once the round is finished", () => {
    const solved = run(fresh(), { type: "GUESS", value: 2.0 });
    const after = posokaneiReducer(solved, { type: "GUESS", value: 1.0 });
    expect(after).toBe(solved);
  });

  it("GIVE_UP forces a finished, failed round", () => {
    const s = run(fresh(), { type: "GUESS", value: 1.0 }, { type: "GIVE_UP" });
    expect(s.gaveUp).toBe(true);
    expect(s.failed).toBe(true);
    expect(s.stage).toBe("finished");
  });

  it("RESTORE_STATE replays a saved history through the same derivation", () => {
    const played = run(fresh(), { type: "GUESS", value: 1.0 }, { type: "GUESS", value: 2.0 });
    const restored = posokaneiReducer(fresh(), {
      type: "RESTORE_STATE",
      guesses: played.guesses,
      gaveUp: false,
    });
    expect(restored.solved).toBe(true);
    expect(restored.stage).toBe("finished");
    expect(restored.guesses).toEqual(played.guesses);
  });
});

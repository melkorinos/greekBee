// Leksoplegma reducer — TRACE_WORD (required either direction / miss / dup),
// USE_HINT (per-word cap, auto-targets the first unfound un-hinted required
// word), terminal state (last required word ends the puzzle), RESTORE_STATE.

import { describe, it, expect } from "vitest";

import {
  leksoplegmaReducer,
  makeInitialLeksoplegmaState,
  getActiveHints,
  getRoundScore,
  type LeksoplegmaAction,
} from "@/games/leksoplegma/lib/leksoplegmaReducer";
import { computeScore } from "@/games/leksoplegma/lib/scoring";
import type { LeksoplegmaState } from "@/games/leksoplegma/types";

// Fixture board (grid-size agnostic — the reducer works on puzzle data alone):
// tiles 0..4 = α β γ δ ε; required αβγ (0-1-2), γδε (2-3-4), εα (4-0).
// bonusWords is offline-only data and never a runtime game element.
function makeState(): LeksoplegmaState {
  return makeInitialLeksoplegmaState("2026-07-14", {
    id:         "test-1",
    letters:    "αβγδε",
    paths:      { αβγ: [0, 1, 2], γδε: [2, 3, 4], εα: [4, 0] },
    bonusWords: [],
  });
}

function dispatch(state: LeksoplegmaState, ...actions: LeksoplegmaAction[]): LeksoplegmaState {
  return actions.reduce(leksoplegmaReducer, state);
}

describe("TRACE_WORD — required words", () => {
  it("records a required word traced along live edges", () => {
    const s = dispatch(makeState(), { type: "TRACE_WORD", trace: [0, 1, 2] });
    expect(s.foundRequired).toEqual(["αβγ"]);
    expect(s.wrongTrace).toBe(false);
    expect(s.status).toBe("playing");
  });

  it("accepts a word traced in reverse (edges are undirected)", () => {
    // γβα spells "αβγ" backwards — the player may draw the path either way.
    const s = dispatch(makeState(), { type: "TRACE_WORD", trace: [2, 1, 0] });
    expect(s.foundRequired).toEqual(["αβγ"]);
    expect(s.wrongTrace).toBe(false);
  });

  it("rejects re-tracing a found word — its edges have collapsed", () => {
    const s = dispatch(
      makeState(),
      { type: "TRACE_WORD", trace: [0, 1, 2] },
      { type: "TRACE_WORD", trace: [0, 1, 2] },
    );
    expect(s.foundRequired).toEqual(["αβγ"]);
    expect(s.wrongTrace).toBe(true);
  });

  it("finishes when the last required word is found", () => {
    const s = dispatch(
      makeState(),
      { type: "TRACE_WORD", trace: [0, 1, 2] },
      { type: "TRACE_WORD", trace: [2, 3, 4] },
      { type: "TRACE_WORD", trace: [4, 0] },
    );
    expect(s.status).toBe("finished");
  });

  it("ignores further traces after the round is finished", () => {
    const finished = dispatch(
      makeState(),
      { type: "TRACE_WORD", trace: [0, 1, 2] },
      { type: "TRACE_WORD", trace: [2, 3, 4] },
      { type: "TRACE_WORD", trace: [4, 0] },
    );
    expect(dispatch(finished, { type: "TRACE_WORD", trace: [1, 2] })).toBe(finished);
  });
});

describe("TRACE_WORD — misses", () => {
  it("flags a valid trace that spells no word", () => {
    const s = dispatch(makeState(), { type: "TRACE_WORD", trace: [2, 3] }); // "γδ"
    expect(s.wrongTrace).toBe(true);
    expect(s.foundRequired).toEqual([]);
  });

  it("flags a trace over a non-existent edge even if it spells a word", () => {
    // 0-2 was never drawn, so "αγ" can't be traced
    const s = dispatch(makeState(), { type: "TRACE_WORD", trace: [0, 2] });
    expect(s.wrongTrace).toBe(true);
  });

  it("clears the wrong-trace flag on the next accepted trace", () => {
    const s = dispatch(
      makeState(),
      { type: "TRACE_WORD", trace: [2, 3] },
      { type: "TRACE_WORD", trace: [0, 1, 2] },
    );
    expect(s.wrongTrace).toBe(false);
  });
});

describe("USE_HINT", () => {
  it("hints the first unfound un-hinted required word (paths order)", () => {
    const s = dispatch(makeState(), { type: "USE_HINT" });
    expect(s.hintsUsed).toEqual(["αβγ"]);
  });

  it("skips already-found words when picking the hint target", () => {
    const s = dispatch(
      makeState(),
      { type: "TRACE_WORD", trace: [0, 1, 2] },
      { type: "USE_HINT" },
    );
    expect(s.hintsUsed).toEqual(["γδε"]);
  });

  it("caps at one hint per word — a second hint targets the next word", () => {
    const s = dispatch(makeState(), { type: "USE_HINT" }, { type: "USE_HINT" });
    expect(s.hintsUsed).toEqual(["αβγ", "γδε"]);
  });

  it("is a no-op when every unfound word is already hinted", () => {
    const allHinted = dispatch(
      makeState(),
      { type: "USE_HINT" },
      { type: "USE_HINT" },
      { type: "USE_HINT" },
    );
    expect(leksoplegmaReducer(allHinted, { type: "USE_HINT" })).toBe(allHinted);
  });

  it("exposes start tile + length for hinted unfound words only", () => {
    const s = dispatch(
      makeState(),
      { type: "USE_HINT" }, // hints αβγ
      { type: "TRACE_WORD", trace: [0, 1, 2] }, // finds it
    );
    expect(getActiveHints(s)).toEqual([]);
    const s2 = dispatch(s, { type: "USE_HINT" }); // hints γδε
    expect(getActiveHints(s2)).toEqual([{ startTile: 2, length: 3 }]);
  });
});

describe("score", () => {
  it("derives the round score from found words and hints via computeScore", () => {
    const s = dispatch(
      makeState(),
      { type: "USE_HINT" },
      { type: "TRACE_WORD", trace: [0, 1, 2] },
    );
    expect(getRoundScore(s)).toBe(computeScore(["αβγ"], ["αβγ"]));
  });

  it("an edge that collapsed after its word was found can no longer be traced", () => {
    const s = dispatch(
      makeState(),
      { type: "TRACE_WORD", trace: [0, 1, 2] }, // finding αβγ kills edge 1-2
      { type: "TRACE_WORD", trace: [1, 2] },
    );
    expect(s.wrongTrace).toBe(true);
  });
});

describe("RESTORE_STATE", () => {
  it("restores found/hints and recomputes a playing status", () => {
    const s = dispatch(makeState(), {
      type: "RESTORE_STATE",
      foundRequired: ["αβγ"],
      hintsUsed: ["γδε"],
    });
    expect(s.foundRequired).toEqual(["αβγ"]);
    expect(s.hintsUsed).toEqual(["γδε"]);
    expect(s.status).toBe("playing");
  });

  it("restores a finished round when all required words are present", () => {
    const s = dispatch(makeState(), {
      type: "RESTORE_STATE",
      foundRequired: ["αβγ", "γδε", "εα"],
      hintsUsed: [],
    });
    expect(s.status).toBe("finished");
  });

  it("drops restored words that don't belong to this puzzle", () => {
    const s = dispatch(makeState(), {
      type: "RESTORE_STATE",
      foundRequired: ["αβγ", "ξενο"],
      hintsUsed: ["ξενο"],
    });
    expect(s.foundRequired).toEqual(["αβγ"]);
    expect(s.hintsUsed).toEqual([]);
  });
});

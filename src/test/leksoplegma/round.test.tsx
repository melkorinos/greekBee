// round.test.tsx — useLeksoplegmaRound as the integration of leksoplegma's REAL
// reducer with the REAL persistence layer. The generic slot-fill contract
// (hasLiveActed transitions, snapshot key-stability, hasProgress guard, no-rewrite
// on a non-persisted change) lives in useSlotFillRound.test.ts against a synthetic
// reducer; RESTORE_STATE filtering as reducer logic lives in
// leksoplegmaReducer.test.ts. This file owns only what neither covers: that the
// two are wired together correctly, so the ADR 0019 migration onto the shared
// spine is behavior-preserving. Every assertion here must stay green across that
// migration — it is the safety net, not a red-first spec for new behavior.

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useLeksoplegmaRound } from "@/games/leksoplegma/hooks/useLeksoplegmaRound";
import type { LeksoplegmaPuzzle } from "@/games/leksoplegma/types";

// Same fixture board the reducer test uses: tiles 0..4 = α β γ δ ε; required
// αβγ (0-1-2), γδε (2-3-4), εα (4-0); extra word βγδ on the shared edges.
const PUZZLE: LeksoplegmaPuzzle = {
  id:         "test-1",
  letters:    "αβγδε",
  paths:      { αβγ: [0, 1, 2], γδε: [2, 3, 4], εα: [4, 0] },
  bonusWords: ["βγδ"],
};

const TODAY = "2026-07-27";

function setup(puzzle: LeksoplegmaPuzzle = PUZZLE, today = TODAY) {
  return renderHook(() => useLeksoplegmaRound(puzzle, today));
}

/** Reads the raw persisted leksoplegma slice for a session key. */
function readPersisted(sessionKey = TODAY): Record<string, unknown> | undefined {
  const raw = localStorage.getItem("wordgames:state");
  if (!raw) return undefined;
  const slice = (JSON.parse(raw) as Record<string, unknown>).leksoplegma as
    | Record<string, Record<string, unknown>>
    | undefined;
  return slice?.[sessionKey];
}

beforeEach(() => localStorage.clear());

describe("useLeksoplegmaRound — real reducer through real persistence", () => {
  it("round-trips found required, bonus, and hinted words across a remount", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [0, 1, 2] })); // αβγ
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [1, 2, 3] })); // βγδ (extra)
    act(() => first.result.current.dispatch({ type: "USE_HINT" }));                     // hints γδε
    first.unmount();

    const second = setup();
    expect(second.result.current.state.foundRequired).toEqual(["αβγ"]);
    expect(second.result.current.state.foundBonus).toEqual(["βγδ"]);
    expect(second.result.current.state.hintsUsed).toEqual(["γδε"]);
    expect(second.result.current.state.status).toBe("playing");
  });

  it("re-derives a finished status from the restored required words, not from a persisted flag", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [0, 1, 2] })); // αβγ
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [2, 3, 4] })); // γδε
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [4, 0] }));    // εα → last
    expect(first.result.current.state.status).toBe("finished");
    first.unmount();

    const second = setup();
    expect(second.result.current.state.foundRequired).toHaveLength(3);
    expect(second.result.current.state.status).toBe("finished");
  });

  it("keeps wrongTrace out of persistence and false after restore", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [0, 1, 2] })); // αβγ, real progress
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [0, 3] }));     // invalid edge → wrongTrace
    expect(first.result.current.state.wrongTrace).toBe(true);
    first.unmount();

    expect(readPersisted()).not.toHaveProperty("wrongTrace");
    const second = setup();
    expect(second.result.current.state.wrongTrace).toBe(false);
  });

  it("restores clean from a snapshot written by the brief bonus-less build (no foundBonus)", () => {
    // Simulate a legacy snapshot: the reducer's RESTORE path defaults foundBonus
    // to [] via `?? []`, so an old row without it must not throw or leave undefined.
    localStorage.setItem(
      "wordgames:state",
      JSON.stringify({
        leksoplegma: {
          [TODAY]: { puzzleId: TODAY, foundRequired: ["αβγ"], hintsUsed: [], status: "playing" },
        },
      }),
    );

    const { result } = setup();
    expect(result.current.state.foundRequired).toEqual(["αβγ"]);
    expect(result.current.state.foundBonus).toEqual([]);
  });

  it("filters a stale saved word that is no longer in the current puzzle", () => {
    // A snapshot from a different board carries a word this puzzle doesn't have.
    localStorage.setItem(
      "wordgames:state",
      JSON.stringify({
        leksoplegma: {
          [TODAY]: {
            puzzleId:      TODAY,
            foundRequired: ["αβγ", "ζζζ"], // ζζζ is not in PUZZLE.paths
            foundBonus:    ["βγδ", "θθθ"], // θθθ is not in PUZZLE.bonusWords
            hintsUsed:     ["γδε", "ωωω"], // ωωω is not in PUZZLE.paths
            status:        "playing",
          },
        },
      }),
    );

    const { result } = setup();
    expect(result.current.state.foundRequired).toEqual(["αβγ"]);
    expect(result.current.state.foundBonus).toEqual(["βγδ"]);
    expect(result.current.state.hintsUsed).toEqual(["γδε"]);
  });

  it("reports no live action after a pure restore, then flips once the player acts", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "TRACE_WORD", trace: [0, 1, 2] }));
    first.unmount();

    const second = setup();
    expect(second.result.current.state.foundRequired).toEqual(["αβγ"]); // restore happened
    expect(second.result.current.hasLiveActed()).toBe(false);           // but it was not live

    act(() => second.result.current.dispatch({ type: "TRACE_WORD", trace: [2, 3, 4] }));
    expect(second.result.current.hasLiveActed()).toBe(true);
  });

  it("does not persist a round the player never touched", () => {
    setup();
    expect(readPersisted()).toBeUndefined();
  });
});

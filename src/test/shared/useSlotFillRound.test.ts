// useSlotFillRound.test.ts — the shared slot-fill round spine (Topothesies,
// Πόσο κάνει;, Λογοπαίγνιο). Tested through its interface with a synthetic
// reducer/state, so the contract (live-vs-restore, snapshot persist + replay,
// save guard, per-session isolation) is verified independently of any one game.
//
// The contract that most needs a single home is `hasLiveActed`: the spine issues
// RESTORE_STATE itself through the raw dispatch, so a restored-but-untouched
// round must never report a live action — that is what keeps useLiveScorePost
// from posting a score the player did not earn this session.

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSlotFillRound } from "@/hooks/useSlotFillRound";

// ── Synthetic slot-fill game ────────────────────────────────────────────────────

interface TestState {
  puzzleId: string;
  guesses:  string[];
  gaveUp:   boolean;
  /** A derived flag — proves flags are replayed, not persisted. */
  solved:   boolean;
  /** A non-persisted field (mirrors a typed-but-uncommitted input). */
  draft:    string;
}

type TestAction =
  | { type: "GUESS"; input: string }
  | { type: "TYPE" }
  | { type: "GIVE_UP" }
  | { type: "RESTORE_STATE"; guesses: string[]; gaveUp: boolean };

interface TestSnapshot {
  puzzleId: string;
  guesses:  string[];
  gaveUp:   boolean;
}

const derive = (guesses: string[]): boolean => guesses.includes("right");

function reducer(state: TestState, action: TestAction): TestState {
  switch (action.type) {
    case "GUESS": {
      const guesses = [...state.guesses, action.input];
      return { ...state, guesses, solved: derive(guesses) };
    }
    case "TYPE":
      return { ...state, draft: `${state.draft}x` };
    case "GIVE_UP":
      return { ...state, gaveUp: true };
    case "RESTORE_STATE":
      return {
        ...state,
        guesses: action.guesses,
        gaveUp:  action.gaveUp,
        solved:  derive(action.guesses),
      };
    default:
      return state;
  }
}

const makeInitialState = (puzzle: { id: string }): TestState => ({
  puzzleId: puzzle.id,
  guesses:  [],
  gaveUp:   false,
  solved:   false,
  draft:    "",
});

function setup(today = "2026-07-27", puzzleId = "p1") {
  return renderHook(() =>
    useSlotFillRound<TestState, TestAction, TestSnapshot, { id: string }>({
      gameId:     "posokanei",
      sessionKey: today,
      puzzle:     { id: puzzleId },
      reducer,
      makeInitialState,
      toSnapshot: (state) => ({
        puzzleId: state.puzzleId,
        guesses:  state.guesses,
        gaveUp:   state.gaveUp,
      }),
      makeRestoreAction: (snap) => ({
        type:    "RESTORE_STATE",
        guesses: snap.guesses ?? [],
        gaveUp:  snap.gaveUp ?? false,
      }),
      hasProgress: (snap) => snap.guesses.length > 0 || Boolean(snap.gaveUp),
    }),
  );
}

function readPersisted(gameId = "posokanei") {
  const raw = localStorage.getItem("wordgames:state");
  return raw ? (JSON.parse(raw) as Record<string, unknown>)[gameId] : undefined;
}

/** Counts localStorage writes from this point on, until restored. */
function trackWrites() {
  const spy = vi.spyOn(Storage.prototype, "setItem");
  return {
    count: () => {
      const n = spy.mock.calls.length;
      spy.mockRestore();
      return n;
    },
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ── hasLiveActed — the live-vs-restore distinction ──────────────────────────────

describe("useSlotFillRound — hasLiveActed", () => {
  it("is false on a fresh round the player has not touched", () => {
    const { result } = setup();
    expect(result.current.hasLiveActed()).toBe(false);
  });

  it("flips to true on the first live dispatch", () => {
    const { result } = setup();
    act(() => result.current.dispatch({ type: "GUESS", input: "wrong" }));
    expect(result.current.hasLiveActed()).toBe(true);
  });

  it("stays false when a saved round is restored but never touched", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "GUESS", input: "wrong" }));
    first.unmount();

    // Fresh mount restores the saved round — a replay is not a live action.
    const second = setup();
    expect(second.result.current.state.guesses).toEqual(["wrong"]);
    expect(second.result.current.hasLiveActed()).toBe(false);
  });

  it("flips to true when the player acts on a restored round", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "GUESS", input: "wrong" }));
    first.unmount();

    const second = setup();
    act(() => second.result.current.dispatch({ type: "GUESS", input: "right" }));
    expect(second.result.current.hasLiveActed()).toBe(true);
  });
});

// ── Persistence ─────────────────────────────────────────────────────────────────

describe("useSlotFillRound — persistence", () => {
  it("persists the snapshot and replays it on a fresh mount with the same session key", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "GUESS", input: "wrong" }));
    act(() => first.result.current.dispatch({ type: "GUESS", input: "right" }));
    first.unmount();

    const second = setup();
    expect(second.result.current.state.guesses).toEqual(["wrong", "right"]);
  });

  it("replays derived flags rather than persisting them", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "GUESS", input: "right" }));
    first.unmount();

    // `solved` is never in the snapshot — it can only be true if the reducer
    // re-derived it from the replayed history.
    const persisted = readPersisted() as Record<string, Record<string, unknown>>;
    expect(persisted["2026-07-27"]).not.toHaveProperty("solved");

    const second = setup();
    expect(second.result.current.state.solved).toBe(true);
  });

  it("restores a give-up round", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "GIVE_UP" }));
    first.unmount();

    const second = setup();
    expect(second.result.current.state.gaveUp).toBe(true);
  });

  it("does not write an untouched round (hasProgress guard)", () => {
    setup();
    expect(readPersisted()).toBeUndefined();
  });

  it("does not write when only a non-persisted field changes", () => {
    const { result } = setup();
    act(() => result.current.dispatch({ type: "TYPE" })); // typing only — no guess yet
    expect(readPersisted()).toBeUndefined();
  });

  it("does not re-write a round when only a non-persisted field changes after a guess", () => {
    const { result } = setup();
    act(() => result.current.dispatch({ type: "GUESS", input: "wrong" }));

    // Typing after a guess must not trigger another write: the snapshot's
    // persisted fields are unchanged, so its reference must stay stable.
    const writes = trackWrites();
    act(() => result.current.dispatch({ type: "TYPE" }));
    expect(writes.count()).toBe(0);
  });

  it("keeps sessions separate per session key", () => {
    const a = setup("2026-07-27");
    act(() => a.result.current.dispatch({ type: "GUESS", input: "wrong" }));
    a.unmount();

    const b = setup("2026-07-28");
    expect(b.result.current.state.guesses).toEqual([]);
  });
});

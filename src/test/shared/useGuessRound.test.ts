// useGuessRound.test.ts — the shared guess-game spine.
// Tested through its interface with a synthetic reducer/state, so the contract
// (persist { guesses, status }, score only on game end, end-callback once, save
// guard) is verified independently of any one game.

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGuessRound, type GuessRoundSnapshot } from "@/hooks/useGuessRound";

// ── Synthetic guess game ────────────────────────────────────────────────────────

interface TestState {
  guesses: number[];
  status:  "playing" | "won" | "lost";
  /** A non-persisted field (mirrors currentInput) — typing must not trigger writes. */
  cursor:  number;
}

type TestAction =
  | { type: "ADD" }
  | { type: "TYPE" }
  | { type: "WIN" }
  | { type: "LOSE" }
  | { type: "RESTORE_STATE"; guesses: number[]; status: TestState["status"] };

function reducer(state: TestState, action: TestAction): TestState {
  switch (action.type) {
    case "ADD":  return { ...state, guesses: [...state.guesses, state.guesses.length] };
    case "TYPE": return { ...state, cursor: state.cursor + 1 };
    case "WIN":  return { ...state, status: "won" };
    case "LOSE": return { ...state, status: "lost" };
    case "RESTORE_STATE":
      return { ...state, guesses: action.guesses, status: action.status, cursor: 0 };
    default:     return state;
  }
}

const makeInitialState = (): TestState => ({
  guesses: [],
  status:  "playing",
  cursor:  0,
});

const makeRestoreAction = (snap: GuessRoundSnapshot<number>): TestAction => ({
  type:    "RESTORE_STATE",
  guesses: snap.guesses,
  status:  snap.status,
});

const scoreFn = (attempts: number, won: boolean) => (won ? 10 - attempts : 0);

function setup(onGameEnd?: (attempts: number, won: boolean) => void, puzzleId = "p1") {
  return renderHook(() =>
    useGuessRound<TestState, TestAction, number, { id: string }>({
      gameId:            "leksiarxeio",
      puzzle:            { id: puzzleId },
      puzzleId,
      reducer,
      makeInitialState,
      makeRestoreAction,
      scoreFn,
      onGameEnd,
    }),
  );
}

function readPersisted(gameId = "leksiarxeio") {
  const raw = localStorage.getItem("wordgames:state");
  return raw ? (JSON.parse(raw) as Record<string, unknown>)[gameId] : undefined;
}

beforeEach(() => {
  localStorage.clear();
});

// ── Score ───────────────────────────────────────────────────────────────────────

describe("useGuessRound — score", () => {
  it("is 0 while the game is still playing", () => {
    const { result } = setup();
    act(() => result.current.dispatch({ type: "ADD" }));
    expect(result.current.score).toBe(0);
  });

  it("equals scoreFn(attempts, won) once the game is won", () => {
    const { result } = setup();
    act(() => result.current.dispatch({ type: "ADD" }));
    act(() => result.current.dispatch({ type: "ADD" }));
    act(() => result.current.dispatch({ type: "WIN" }));
    expect(result.current.score).toBe(8); // 10 - 2 attempts
  });

  it("is 0 on a loss (scoreFn returns 0 for won=false)", () => {
    const { result } = setup();
    act(() => result.current.dispatch({ type: "ADD" }));
    act(() => result.current.dispatch({ type: "LOSE" }));
    expect(result.current.score).toBe(0);
  });
});

// ── End callback ──────────────────────────────────────────────────────────────────

describe("useGuessRound — onGameEnd", () => {
  it("fires once with (attempts, won) when the game ends", () => {
    const onGameEnd = vi.fn();
    const { result } = setup(onGameEnd);
    act(() => result.current.dispatch({ type: "ADD" }));
    act(() => result.current.dispatch({ type: "ADD" }));
    act(() => result.current.dispatch({ type: "WIN" }));
    expect(onGameEnd).toHaveBeenCalledOnce();
    expect(onGameEnd).toHaveBeenCalledWith(2, true);
  });
});

// ── Persistence ───────────────────────────────────────────────────────────────────

describe("useGuessRound — persistence", () => {
  it("persists { guesses, status } and restores them on a fresh mount with the same puzzleId", () => {
    const first = setup();
    act(() => first.result.current.dispatch({ type: "ADD" }));
    act(() => first.result.current.dispatch({ type: "WIN" }));
    first.unmount();

    const second = setup();
    expect(second.result.current.state.guesses).toEqual([0]);
    expect(second.result.current.state.status).toBe("won");
  });

  it("does not write before the first guess (shouldSave guard)", () => {
    const { result } = setup();
    act(() => result.current.dispatch({ type: "TYPE" })); // typing only — no guess yet
    expect(readPersisted()).toBeUndefined();
  });

  it("keeps sessions separate per puzzleId", () => {
    const a = setup(undefined, "pA");
    act(() => a.result.current.dispatch({ type: "ADD" }));
    a.unmount();

    const b = setup(undefined, "pB");
    expect(b.result.current.state.guesses).toEqual([]);
  });
});

// useLeksodromiaRound.test.ts — clock + persistence spine of Leksodromia.
// The clock accumulates only while running AND the tab is visible, and the
// round snapshot (wordIndex, results, current hints, current elapsed) survives
// a refresh — the decay clock must NOT reset when the player reloads.

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readSlice, writeSlice } from "@/hooks/useGameStore";
import { getCurrentAnswer, getCurrentInput, isSecondChance } from "@/games/leksodromia/lib/leksodromiaReducer";
import { useElapsedClock } from "@/games/leksodromia/hooks/useElapsedClock";
import { useLeksodromiaRound } from "@/games/leksodromia/hooks/useLeksodromiaRound";

// Same σ-normalized fixture round as the reducer tests.
const WORDS = [
  "αυγο", "βημα",
  "αγορα", "βαρκα",
  "γραμμα", "δασκοσ",
  "αγγελοσ", "βαθμιδα",
  "αγκαλιεσ", "βαρκαρησ",
];
const SCRAMBLES = [
  "γοαυ", "μαβη",
  "ρααγο", "καβαρ",
  "αμγμρα", "σοκαδσ",
  "γλοσαγε", "μιδαβαθ",
  "λακιεσγα", "ρσηκβααρ",
];
const PUZZLE = { date: "2026-07-13", words: WORDS, scrambles: SCRAMBLES };

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  setVisibility("visible");
  vi.useRealTimers();
});

// ── useElapsedClock ───────────────────────────────────────────────────────────

describe("useElapsedClock", () => {
  it("accumulates elapsed ms while running", () => {
    const { result } = renderHook(() => useElapsedClock(true));
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(result.current.getElapsedMs()).toBe(5_000);
    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(4_750);
  });

  it("does not accumulate while running is false (pause modal open)", () => {
    const { result, rerender } = renderHook(
      ({ running }) => useElapsedClock(running),
      { initialProps: { running: true } },
    );
    act(() => { vi.advanceTimersByTime(2_000); });
    rerender({ running: false });
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.getElapsedMs()).toBe(2_000);
  });

  it("pauses while the tab is hidden and resumes on visible", () => {
    const { result } = renderHook(() => useElapsedClock(true));
    act(() => { vi.advanceTimersByTime(3_000); });
    act(() => { setVisibility("hidden"); });
    act(() => { vi.advanceTimersByTime(120_000); });
    act(() => { setVisibility("visible"); });
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.getElapsedMs()).toBe(4_000);
  });

  it("reset() restarts from 0; reset(base) seeds a restored elapsed", () => {
    const { result } = renderHook(() => useElapsedClock(true));
    act(() => { vi.advanceTimersByTime(9_000); });
    act(() => { result.current.reset(); });
    expect(result.current.getElapsedMs()).toBe(0);
    act(() => { result.current.reset(30_000); });
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current.getElapsedMs()).toBe(32_000);
  });
});

// ── useLeksodromiaRound ───────────────────────────────────────────────────────

function solveCurrentWord(
  result: { current: ReturnType<typeof useLeksodromiaRound> },
) {
  const { state } = result.current;
  const answer = getCurrentAnswer(state); // retry-aware
  act(() => {
    for (const letter of answer.slice(getCurrentInput(state).length)) {
      result.current.dispatch({ type: "ADD_LETTER", letter });
    }
  });
  act(() => { result.current.submitWord(); });
}

describe("useLeksodromiaRound", () => {
  it("submitWord scores with the clock's elapsed time and resets the clock for the next word", () => {
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    act(() => { vi.advanceTimersByTime(10_000); });
    solveCurrentWord(result);
    expect(result.current.state.results[0].elapsedMs).toBe(10_000);
    expect(result.current.state.wordIndex).toBe(1);
    expect(result.current.getElapsedMs()).toBe(0);
  });

  it("persists the snapshot under the puzzle date after progress", () => {
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    solveCurrentWord(result);
    const slice = readSlice<Record<string, { wordIndex: number; results: unknown[] }>>("leksodromia");
    expect(slice?.[PUZZLE.date]?.wordIndex).toBe(1);
    expect(slice?.[PUZZLE.date]?.results).toHaveLength(1);
  });

  it("does not write a slice for an untouched fresh round", () => {
    renderHook(() => useLeksodromiaRound(PUZZLE));
    expect(readSlice("leksodromia")).toBeNull();
  });

  it("refresh mid-round restores wordIndex, results, hints AND the clock", () => {
    const savedResults = [
      { word: "αυγο", status: "solved" as const, elapsedMs: 5_000, hintsUsed: 0, points: 55 },
      { word: "βημα", status: "skipped" as const, elapsedMs: 8_000, hintsUsed: 0, points: 0 },
    ];
    writeSlice("leksodromia", {
      [PUZZLE.date]: {
        puzzleId: PUZZLE.date,
        wordIndex: 2,
        currentElapsedMs: 30_000,
        currentHintsUsed: 1,
        results: savedResults,
      },
    });

    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    expect(result.current.state.wordIndex).toBe(2);
    expect(result.current.state.results).toEqual(savedResults);
    expect(result.current.state.hintsUsed).toBe(1);
    // Clock resumes from the persisted elapsed — refresh-abuse-proof
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.getElapsedMs()).toBe(31_000);
    // The restore itself must not zero the clock via the word-advance reset
    expect(getCurrentInput(result.current.state)).toBe("α"); // hint prefix of "αγορα"
  });

  it("a solve after a restore still resets the clock to 0", () => {
    writeSlice("leksodromia", {
      [PUZZLE.date]: {
        puzzleId: PUZZLE.date,
        wordIndex: 1,
        currentElapsedMs: 20_000,
        currentHintsUsed: 0,
        results: [{ word: "αυγο", status: "solved", elapsedMs: 5_000, hintsUsed: 0, points: 55 }],
      },
    });
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    solveCurrentWord(result); // solves "βημα"
    expect(result.current.state.wordIndex).toBe(2);
    expect(result.current.getElapsedMs()).toBe(0);
  });

  it("skipWord requeues the word with the elapsed as its retry base and zeroes the clock", () => {
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    act(() => { vi.advanceTimersByTime(7_000); });
    act(() => { result.current.skipWord(); });
    expect(result.current.state.results).toEqual([]); // nothing final yet
    expect(result.current.state.retries[10]).toMatchObject({
      origIndex: 0, baseElapsedMs: 7_000, baseHints: 0,
    });
    expect(result.current.getElapsedMs()).toBe(0); // next word starts fresh
  });

  it("arriving at a second chance resumes the clock from the retry base", () => {
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    act(() => { vi.advanceTimersByTime(7_000); });
    act(() => { result.current.skipWord(); }); // requeue αυγο @ 7 s
    for (let i = 1; i < WORDS.length; i++) solveCurrentWord(result);
    expect(isSecondChance(result.current.state)).toBe(true);
    expect(getCurrentAnswer(result.current.state)).toBe("αυγο");
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(result.current.getElapsedMs()).toBe(9_000); // 7 s base + 2 s now
  });

  it("hasLiveActed is false on a fresh round and flips on the first live action", () => {
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    expect(result.current.hasLiveActed()).toBe(false);
    act(() => { result.current.dispatch({ type: "ADD_LETTER", letter: "α" }); });
    expect(result.current.hasLiveActed()).toBe(true);
  });

  it("a restore alone never flips hasLiveActed (a restored round must not post)", () => {
    writeSlice("leksodromia", {
      [PUZZLE.date]: {
        puzzleId: PUZZLE.date,
        wordIndex: 2,
        currentElapsedMs: 30_000,
        currentHintsUsed: 0,
        results: [
          { word: "αυγο", status: "solved", elapsedMs: 5_000, hintsUsed: 0, points: 55 },
          { word: "βημα", status: "solved", elapsedMs: 8_000, hintsUsed: 0, points: 40 },
        ],
      },
    });
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    expect(result.current.state.wordIndex).toBe(2); // restore applied
    expect(result.current.hasLiveActed()).toBe(false); // but no live action yet
  });

  it("a refresh mid-second-chance restores the retry redirect and the cumulative clock", () => {
    writeSlice("leksodromia", {
      [PUZZLE.date]: {
        puzzleId: PUZZLE.date,
        wordIndex: 10,
        currentElapsedMs: 12_000,
        currentHintsUsed: 0,
        results: [],
        retries: { 10: { origIndex: 0, baseElapsedMs: 7_000, baseHints: 0 } },
      },
    });
    const { result } = renderHook(() => useLeksodromiaRound(PUZZLE));
    expect(isSecondChance(result.current.state)).toBe(true);
    expect(getCurrentAnswer(result.current.state)).toBe("αυγο");
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(result.current.getElapsedMs()).toBe(13_000);
  });
});

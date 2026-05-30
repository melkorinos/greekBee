// useGameState.test.ts — tests for the server-restore path in useGameState.
//
// Covers the mount-time fetch that restores found words from game_state when
// the player has a linked profile, it's a daily puzzle, and local state is empty.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useGameState } from "@/games/leksokipos/hooks/useGameState";
import type { LeksokiposPuzzle } from "@/games/leksokipos/types";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/hooks/useGameStore", () => ({
  readSlice:           vi.fn(() => null),
  writeSlice:          vi.fn(),
  clearSlice:          vi.fn(),
  getOrCreateDeviceId: vi.fn(() => "device-abc"),
  isProfileLinked:     vi.fn(() => false),
}));

import {
  getOrCreateDeviceId,
  isProfileLinked,
  readSlice,
} from "@/hooks/useGameStore";

// ── Fixture ───────────────────────────────────────────────────────────────────

// Daily puzzle: ID matches YYYY-MM-DD-el pattern
const DAILY_PUZZLE: LeksokiposPuzzle = {
  id:           "2026-01-01-el",
  language:     "el",
  date:         "2026-01-01",
  centerLetter: "α",
  outerLetters: ["π", "ι", "ν", "τ", "ε", "δ"],
  validWords:   ["αντι", "παιδ", "παιδι", "παιδια"],
};

// Non-daily (custom) puzzle
const CUSTOM_PUZZLE: LeksokiposPuzzle = {
  ...DAILY_PUZZLE,
  id: "custom-α-πιντεδ",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockFetchState(foundWords: string[] | null) {
  const state = foundWords ? { foundWords } : null;
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok:   true,
    json: async () => ({ state }),
  } as Response);
}

function mockFetchError() {
  return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

afterEach(() => vi.restoreAllMocks());

describe("useGameState — server restore gates", () => {
  it("does not fetch when puzzle is not daily", async () => {
    vi.mocked(isProfileLinked).mockReturnValue(true);
    const spy = mockFetchState(["αντι"]);

    await act(async () => { renderHook(() => useGameState(CUSTOM_PUZZLE)); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not fetch when profile is not linked", async () => {
    vi.mocked(isProfileLinked).mockReturnValue(false);
    const spy = mockFetchState(["αντι"]);

    await act(async () => { renderHook(() => useGameState(DAILY_PUZZLE)); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not fetch when localStorage already has a session for this puzzle", async () => {
    vi.mocked(isProfileLinked).mockReturnValue(true);
    vi.mocked(readSlice).mockReturnValue({ "2026-01-01-el": { foundWords: ["αντι"] } });
    const spy = mockFetchState(["αντι"]);

    await act(async () => { renderHook(() => useGameState(DAILY_PUZZLE)); });

    expect(spy).not.toHaveBeenCalled();
  });

  it("fetches even when local session exists if needs-restore flag is set", async () => {
    vi.mocked(isProfileLinked).mockReturnValue(true);
    vi.mocked(readSlice).mockReturnValue({ "2026-01-01-el": { foundWords: ["αντι"] } });
    localStorage.setItem("leksokipos-needs-restore", "true");
    const spy = mockFetchState(["αντι", "παιδι"]);

    const { result } = await act(async () => renderHook(() => useGameState(DAILY_PUZZLE)));

    expect(spy).toHaveBeenCalledOnce();
    expect(result.current.foundWords).toEqual(["αντι", "παιδι"]);
    expect(localStorage.getItem("leksokipos-needs-restore")).toBeNull();
  });
});

describe("useGameState — server restore success", () => {
  beforeEach(() => {
    vi.mocked(isProfileLinked).mockReturnValue(true);
    vi.mocked(readSlice).mockReturnValue(null);
    vi.mocked(getOrCreateDeviceId).mockReturnValue("device-abc");
  });

  it("calls GET /api/game-state with correct params", async () => {
    const spy = mockFetchState([]);

    await act(async () => { renderHook(() => useGameState(DAILY_PUZZLE)); });

    expect(spy).toHaveBeenCalledOnce();
    const url = (spy.mock.calls[0] as [string])[0];
    expect(url).toContain("device_uuid=device-abc");
    expect(url).toContain("game_id=leksokipos");
    expect(url).toContain("puzzle_date=2026-01-01");
    // Strips the -el locale suffix
    expect(url).not.toContain("2026-01-01-el");
  });

  it("restores foundWords and recomputes score when server has words", async () => {
    mockFetchState(["αντι", "παιδι"]);

    const { result } = await act(async () =>
      renderHook(() => useGameState(DAILY_PUZZLE))
    );

    expect(result.current.foundWords).toEqual(["αντι", "παιδι"]);
    // αντι = 4 letters → 1 pt; παιδι = 5 letters → 5 pts
    expect(result.current.score).toBe(6);
  });

  it("does not restore when server returns empty foundWords array", async () => {
    mockFetchState([]);

    const { result } = await act(async () =>
      renderHook(() => useGameState(DAILY_PUZZLE))
    );

    expect(result.current.foundWords).toEqual([]);
    expect(result.current.score).toBe(0);
  });

  it("does not restore when server returns null state", async () => {
    mockFetchState(null);

    const { result } = await act(async () =>
      renderHook(() => useGameState(DAILY_PUZZLE))
    );

    expect(result.current.foundWords).toEqual([]);
  });

  it("restores givenUp as false regardless of server blob", async () => {
    mockFetchState(["αντι"]);

    const { result } = await act(async () =>
      renderHook(() => useGameState(DAILY_PUZZLE))
    );

    expect(result.current.givenUp).toBe(false);
  });
});

describe("useGameState — server restore error handling", () => {
  beforeEach(() => {
    vi.mocked(isProfileLinked).mockReturnValue(true);
    vi.mocked(readSlice).mockReturnValue(null);
    vi.mocked(getOrCreateDeviceId).mockReturnValue("device-abc");
  });

  it("starts with empty state and does not throw when fetch rejects", async () => {
    mockFetchError();

    const { result } = await act(async () =>
      renderHook(() => useGameState(DAILY_PUZZLE))
    );

    expect(result.current.foundWords).toEqual([]);
    expect(result.current.score).toBe(0);
  });
});

describe("useGameState — restoreFromServer", () => {
  beforeEach(() => {
    vi.mocked(isProfileLinked).mockReturnValue(true);
    vi.mocked(readSlice).mockReturnValue({ "2026-01-01-el": { foundWords: ["αντι"] } });
    vi.mocked(getOrCreateDeviceId).mockReturnValue("device-abc");
  });

  it("fetches and restores even when local session exists", async () => {
    const spy = mockFetchState(["αντι", "παιδι", "παιδια"]);

    const { result } = await act(async () => renderHook(() => useGameState(DAILY_PUZZLE)));
    // mount fetch is skipped (local session exists, no flag)
    expect(spy).not.toHaveBeenCalled();

    await act(async () => { await result.current.restoreFromServer(); });

    expect(spy).toHaveBeenCalledOnce();
    expect(result.current.foundWords).toEqual(["αντι", "παιδι", "παιδια"]);
  });

  it("clears the needs-restore flag when called", async () => {
    localStorage.setItem("leksokipos-needs-restore", "true");
    mockFetchState([]);

    const { result } = await act(async () => renderHook(() => useGameState(DAILY_PUZZLE)));
    // flag caused mount fetch to fire and clear the flag
    expect(localStorage.getItem("leksokipos-needs-restore")).toBeNull();

    // calling restoreFromServer again should not re-set the flag
    await act(async () => { await result.current.restoreFromServer(); });
    expect(localStorage.getItem("leksokipos-needs-restore")).toBeNull();
  });

  it("does nothing when puzzle is not daily", async () => {
    const spy = mockFetchState(["αντι"]);

    const { result } = await act(async () => renderHook(() => useGameState(CUSTOM_PUZZLE)));
    await act(async () => { await result.current.restoreFromServer(); });

    expect(spy).not.toHaveBeenCalled();
  });
});

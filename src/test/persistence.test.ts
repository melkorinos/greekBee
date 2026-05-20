// persistence.test.ts — integration tests for the Spelling Bee persistence layer.
// Verifies that usePersistence correctly delegates to useGameStore and that
// loadPersistedState restores only matching puzzle sessions.
// Tests the migration path from the old "spelling-bee:state" key.

import { clearPersistedState, loadPersistedState } from "@/hooks/usePersistence";
import { describe, expect, it } from "vitest";
import { readSlice, writeSlice } from "@/hooks/useGameStore";

import type { Puzzle } from "@/games/spelling-bee/types";

// ── Test fixture ──────────────────────────────────────────────────────────────

const puzzle: Puzzle = {
  id: "test-persist-puzzle",
  language: "el",
  date: "2026-01-01",
  centerLetter: "α",
  outerLetters: ["π", "ο", "λ", "ε", "μ", "σ"],
  validWords: ["αλφα", "αλμα"],
};

// ── loadPersistedState ────────────────────────────────────────────────────────

describe("loadPersistedState", () => {
  it("returns null when no state has been saved", () => {
    expect(loadPersistedState(puzzle)).toBeNull();
  });

  it("returns null when the saved puzzleId does not match", () => {
    writeSlice("spelling-bee", {
      puzzleId: "different-puzzle-id",
      foundWords: ["αλφα"],
      score: 1,
      currentRank: "Beginner",
      startedAt: Date.now(),
    });
    expect(loadPersistedState(puzzle)).toBeNull();
  });

  it("restores state when the puzzleId matches", () => {
    const startedAt = Date.now();
    writeSlice("spelling-bee", {
      puzzleId: puzzle.id,
      foundWords: ["αλφα", "αλμα"],
      score: 7,
      currentRank: "Moving Up",
      startedAt,
    });

    const restored = loadPersistedState(puzzle);
    expect(restored).toEqual({
      foundWords: ["αλφα", "αλμα"],
      score: 7,
      currentRank: "Moving Up",
      startedAt,
      givenUp: false,
    });
  });

  it("provides safe defaults for missing fields", () => {
    writeSlice("spelling-bee", { puzzleId: puzzle.id }); // minimal snapshot
    const restored = loadPersistedState(puzzle);
    expect(restored?.foundWords).toEqual([]);
    expect(restored?.score).toBe(0);
    expect(restored?.currentRank).toBe("Beginner");
    expect(typeof restored?.startedAt).toBe("number");
  });
});

// ── clearPersistedState ───────────────────────────────────────────────────────

describe("clearPersistedState", () => {
  it("removes the spelling-bee slice from the envelope", () => {
    writeSlice("spelling-bee", { puzzleId: puzzle.id, score: 5 });
    clearPersistedState();
    expect(readSlice("spelling-bee")).toBeNull();
  });

  it("does not disturb other game slices when clearing spelling-bee", () => {
    writeSlice("spelling-bee", { puzzleId: puzzle.id, score: 5 });
    writeSlice("wordle", { streak: 3 });
    clearPersistedState();
    expect(readSlice("wordle")).toEqual({ streak: 3 });
  });
});

// ── legacy migration (via loadPersistedState) ─────────────────────────────────

describe("legacy key migration triggered by loadPersistedState", () => {
  it("migrates old spelling-bee:state key on first loadPersistedState call", () => {
    const legacy = {
      puzzleId: puzzle.id,
      foundWords: ["αλφα"],
      score: 1,
      currentRank: "Beginner",
      startedAt: 1000,
    };
    localStorage.setItem("spelling-bee:state", JSON.stringify(legacy));

    const restored = loadPersistedState(puzzle);

    // State was restored from the migrated data
    expect(restored?.foundWords).toEqual(["αλφα"]);
    expect(restored?.score).toBe(1);

    // Old key was cleaned up
    expect(localStorage.getItem("spelling-bee:state")).toBeNull();

    // New envelope has the data
    expect(readSlice("spelling-bee")).toEqual(legacy);
  });
});

// useGameStore.test.ts — unit tests for the unified localStorage envelope.
// Verifies slice isolation, read/write/clear semantics, and the legacy key migration.
// No React — plain Vitest + jsdom (localStorage is available via setup.ts).

import {
  clearSlice,
  migrateFromLegacyKeys,
  readSlice,
  writeSlice,
} from "@/hooks/useGameStore";
import { describe, expect, it } from "vitest";

// ── helpers ───────────────────────────────────────────────────────────────────

function rawEnvelope() {
  const raw = localStorage.getItem("wordgames:state");
  return raw ? JSON.parse(raw) : null;
}

// setup.ts already calls localStorage.clear() before each test — nothing extra needed.

// ── readSlice ─────────────────────────────────────────────────────────────────

describe("readSlice", () => {
  it("returns null when nothing has been written", () => {
    expect(readSlice("spelling-bee")).toBeNull();
  });

  it("returns null for an untouched game even after another game is written", () => {
    writeSlice("spelling-bee", { score: 10 });
    expect(readSlice("wordle")).toBeNull();
  });

  it("returns the value that was written", () => {
    writeSlice("spelling-bee", { score: 42, foundWords: ["αλφα"] });
    expect(readSlice("spelling-bee")).toEqual({ score: 42, foundWords: ["αλφα"] });
  });
});

// ── writeSlice ────────────────────────────────────────────────────────────────

describe("writeSlice", () => {
  it("writes into the wordgames:state envelope", () => {
    writeSlice("spelling-bee", { score: 5 });
    const env = rawEnvelope();
    expect(env).not.toBeNull();
    expect(env["spelling-bee"]).toEqual({ score: 5 });
  });

  it("does not overwrite another game's slice when writing", () => {
    writeSlice("spelling-bee", { score: 1 });
    writeSlice("connections", { solved: true });

    const env = rawEnvelope();
    // Both slices present and independent
    expect(env["spelling-bee"]).toEqual({ score: 1 });
    expect(env["connections"]).toEqual({ solved: true });
  });

  it("overwrites only the target slice on a second write", () => {
    writeSlice("spelling-bee", { score: 1 });
    writeSlice("wordle",       { streak: 3 });
    writeSlice("spelling-bee", { score: 99 }); // second write to spelling-bee

    const env = rawEnvelope();
    expect(env["spelling-bee"]).toEqual({ score: 99 }); // updated
    expect(env["wordle"]).toEqual({ streak: 3 });        // untouched
  });
});

// ── clearSlice ────────────────────────────────────────────────────────────────

describe("clearSlice", () => {
  it("removes only the target game slice", () => {
    writeSlice("spelling-bee", { score: 10 });
    writeSlice("wordle",       { streak: 2 });

    clearSlice("spelling-bee");

    const env = rawEnvelope();
    expect(env["spelling-bee"]).toBeUndefined();
    expect(env["wordle"]).toEqual({ streak: 2 }); // unaffected
  });

  it("does nothing when the slice does not exist", () => {
    writeSlice("wordle", { streak: 1 });
    clearSlice("spelling-bee"); // not written — should not throw

    expect(readSlice("spelling-bee")).toBeNull();
    expect(readSlice("wordle")).toEqual({ streak: 1 });
  });

  it("readSlice returns null after clearSlice", () => {
    writeSlice("connections", { done: true });
    clearSlice("connections");
    expect(readSlice("connections")).toBeNull();
  });
});

// ── migrateFromLegacyKeys ─────────────────────────────────────────────────────

describe("migrateFromLegacyKeys", () => {
  it("migrates spelling-bee:state into the wordgames:state envelope", () => {
    const legacy = { puzzleId: "2026-01-01-el", score: 7, foundWords: ["αλφα"] };
    localStorage.setItem("spelling-bee:state", JSON.stringify(legacy));

    migrateFromLegacyKeys();

    expect(readSlice("spelling-bee")).toEqual(legacy);
    expect(localStorage.getItem("spelling-bee:state")).toBeNull(); // old key deleted
  });

  it("does not overwrite an existing spelling-bee slice during migration", () => {
    const existing = { puzzleId: "new-puzzle", score: 99 };
    writeSlice("spelling-bee", existing);

    const legacy = { puzzleId: "old-puzzle", score: 1 };
    localStorage.setItem("spelling-bee:state", JSON.stringify(legacy));

    migrateFromLegacyKeys();

    // Existing slice wins — legacy data is discarded
    expect(readSlice("spelling-bee")).toEqual(existing);
    // Old key is still cleaned up
    expect(localStorage.getItem("spelling-bee:state")).toBeNull();
  });

  it("does nothing when no legacy key exists", () => {
    writeSlice("wordle", { streak: 5 });
    migrateFromLegacyKeys(); // should not throw or modify anything

    expect(readSlice("wordle")).toEqual({ streak: 5 });
    expect(readSlice("spelling-bee")).toBeNull();
  });

  it("cleans up corrupt legacy data without throwing", () => {
    localStorage.setItem("spelling-bee:state", "not-valid-json{{");
    expect(() => migrateFromLegacyKeys()).not.toThrow();
    expect(localStorage.getItem("spelling-bee:state")).toBeNull();
  });
});

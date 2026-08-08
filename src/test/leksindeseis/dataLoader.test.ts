// dataLoader.test.ts — unit tests for the Leksindeseis data layer.
// Verifies: community queue consumption, deterministic fallback, and puzzle shape.
// Supabase is mocked; default returns error → static fallback path.

import { describe, expect, it, vi } from "vitest";
import { getTodaysLeksindeseisPuzzle, allLeksindeseisPuzzles } from "@/data/leksindeseis";

// ── Supabase mock ─────────────────────────────────────────────────────────────

import type { ChainResult } from "@/test/helpers/supabaseMock";

let _mockResult: ChainResult = { data: null, error: { message: "no rows" } };

vi.mock("@/lib/supabase", async () => {
  const { makeChain, tableShim } = await import("@/test/helpers/supabaseMock");
  // consumeApprovedPuzzle uses the service-role client; point both at the mock.
  const client = { from: () => makeChain(_mockResult) };
  return {
    getSupabaseClient: () => client,
    getServiceRoleClient: () => client,
  table: tableShim,
  };
});

// ── allLeksindeseisPuzzles ────────────────────────────────────────────────────

describe("allLeksindeseisPuzzles", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(allLeksindeseisPuzzles)).toBe(true);
    expect(allLeksindeseisPuzzles.length).toBeGreaterThan(0);
  });

  it("every puzzle has exactly 4 groups", () => {
    for (const puzzle of allLeksindeseisPuzzles) {
      expect(puzzle.groups).toHaveLength(4);
    }
  });

  it("every group has exactly 4 words", () => {
    for (const puzzle of allLeksindeseisPuzzles) {
      for (const group of puzzle.groups) {
        expect(group.words).toHaveLength(4);
      }
    }
  });

  it("every group has a non-empty category string", () => {
    for (const puzzle of allLeksindeseisPuzzles) {
      for (const group of puzzle.groups) {
        expect(typeof group.category).toBe("string");
        expect(group.category.length).toBeGreaterThan(0);
      }
    }
  });

  it("every group has a difficulty between 1 and 4", () => {
    for (const puzzle of allLeksindeseisPuzzles) {
      for (const group of puzzle.groups) {
        expect(group.difficulty).toBeGreaterThanOrEqual(1);
        expect(group.difficulty).toBeLessThanOrEqual(4);
      }
    }
  });
});

// ── getTodaysLeksindeseisPuzzle — static fallback ─────────────────────────────

describe("getTodaysLeksindeseisPuzzle — static fallback", () => {
  it("returns a puzzle with exactly 4 groups", async () => {
    const { puzzle } = await getTodaysLeksindeseisPuzzle("2026-05-12");
    expect(puzzle).not.toBeNull();
    expect(puzzle!.groups).toHaveLength(4);
  });

  it("returned puzzle date equals the requested date", async () => {
    const { puzzle } = await getTodaysLeksindeseisPuzzle("2026-05-12");
    expect(puzzle!.date).toBe("2026-05-12");
  });

  it("difficulty values are between 1 and 4", async () => {
    const { puzzle } = await getTodaysLeksindeseisPuzzle("2026-05-12");
    for (const g of puzzle!.groups) {
      expect(g.difficulty).toBeGreaterThanOrEqual(1);
      expect(g.difficulty).toBeLessThanOrEqual(4);
    }
  });

  it("deterministic — same date always returns the same puzzle content", async () => {
    const a = await getTodaysLeksindeseisPuzzle("2026-06-10");
    const b = await getTodaysLeksindeseisPuzzle("2026-06-10");
    expect(a.puzzle!.groups[0].category).toBe(b.puzzle!.groups[0].category);
  });

  it("is deterministic — same date always returns the same puzzle", async () => {
    const a = await getTodaysLeksindeseisPuzzle("2026-03-15");
    const b = await getTodaysLeksindeseisPuzzle("2026-03-15");
    expect(a.puzzle!.groups[0].category).toBe(b.puzzle!.groups[0].category);
  });

  it("returns a puzzle (not null) for any date", async () => {
    const { puzzle } = await getTodaysLeksindeseisPuzzle("1999-01-01");
    expect(puzzle).not.toBeNull();
    expect(puzzle!.groups).toHaveLength(4);
  });

  it("submitter_name is null on static fallback", async () => {
    const { submitter_name } = await getTodaysLeksindeseisPuzzle("2026-05-12");
    expect(submitter_name).toBeNull();
  });

  it("all 16 words across the 4 groups are unique", async () => {
    const { puzzle } = await getTodaysLeksindeseisPuzzle("2026-05-12");
    const allWords = puzzle!.groups.flatMap((g) => g.words);
    expect(new Set(allWords).size).toBe(16);
  });
});

// ── getTodaysLeksindeseisPuzzle — community queue path ────────────────────────

describe("getTodaysLeksindeseisPuzzle — community queue", () => {
  const communityGroups = [
    { category: "Ελληνικοί θεοί", words: ["Ζευς", "Ήρα", "Αθηνά", "Ποσειδών"] as [string,string,string,string], difficulty: 1 as const },
    { category: "Χρώματα",        words: ["Κόκκινο", "Μπλε", "Πράσινο", "Κίτρινο"] as [string,string,string,string], difficulty: 2 as const },
    { category: "Φρούτα",         words: ["Μήλο", "Αχλάδι", "Πορτοκάλι", "Λεμόνι"] as [string,string,string,string], difficulty: 3 as const },
    { category: "Ζώα",            words: ["Σκύλος", "Γάτα", "Αλεπού", "Λύκος"] as [string,string,string,string],    difficulty: 4 as const },
  ];

  it("uses community puzzle data when a row is found", async () => {
    _mockResult = {
      data: { id: 10, submitter_name: "Μαρία", data: communityGroups },
      error: null,
    };
    const { puzzle, submitter_name } = await getTodaysLeksindeseisPuzzle("2026-07-01");
    expect(puzzle!.groups[0].category).toBe("Ελληνικοί θεοί");
    expect(submitter_name).toBe("Μαρία");
    _mockResult = { data: null, error: { message: "no rows" } };
  });

  it("puzzle date is set to the requested date", async () => {
    _mockResult = {
      data: { id: 11, submitter_name: "", data: communityGroups },
      error: null,
    };
    const { puzzle } = await getTodaysLeksindeseisPuzzle("2026-07-02");
    expect(puzzle!.date).toBe("2026-07-02");
    _mockResult = { data: null, error: { message: "no rows" } };
  });

  it("submitter_name is null when the row has an empty string", async () => {
    _mockResult = {
      data: { id: 12, submitter_name: "", data: communityGroups },
      error: null,
    };
    const { submitter_name } = await getTodaysLeksindeseisPuzzle("2026-07-03");
    expect(submitter_name).toBeNull();
    _mockResult = { data: null, error: { message: "no rows" } };
  });
});

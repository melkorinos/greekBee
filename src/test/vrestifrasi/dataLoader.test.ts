// dataLoader.test.ts — unit tests for the Vres Tin Frasi data layer.
// Verifies: the deterministic static rotation and buildPuzzle's multi-word
// normalisation (accents stripped, lengths derived).
// Supabase is mocked to RETURN a row on purpose: the loader lost its community
// read on 2026-08-20 (ADR 0027), and a served row would prove it came back.

import { describe, expect, it, vi } from "vitest";

import { getTodayDateString, getTodaysVresTinFrasiPuzzle } from "@/data/vrestifrasi";
import { normalizeLetters } from "@/lib/normalize";

// ── Supabase mock (returns a row — the loader must ignore it entirely) ────────

import type { ChainResult } from "@/test/helpers/supabaseMock";

const _mockResult: ChainResult = {
  data: { id: 10, submitter_name: "Μαρία", data: { phrase: "Καλή μέρα φίλε" } },
  error: null,
};

vi.mock("@/lib/supabase", async () => {
  const { makeChain, tableShim } = await import("@/test/helpers/supabaseMock");
  const client = { from: () => makeChain(_mockResult) };
  return {
    getSupabaseClient: () => client,
    getServiceRoleClient: () => client,
  table: tableShim,
  };
});

// ── getTodaysVresTinFrasiPuzzle ───────────────────────────────────────────────

describe("getTodaysVresTinFrasiPuzzle", () => {
  it("returns a puzzle whose id is `${date}-vresi`", async () => {
    const { puzzle } = await getTodaysVresTinFrasiPuzzle("2026-05-12");
    expect(puzzle.id).toBe("2026-05-12-vresi");
    expect(puzzle.date).toBe("2026-05-12");
  });

  it("is deterministic — same date always returns the same phrase", async () => {
    const a = await getTodaysVresTinFrasiPuzzle("2026-06-10");
    const b = await getTodaysVresTinFrasiPuzzle("2026-06-10");
    expect(a.puzzle.phrase).toBe(b.puzzle.phrase);
  });

  it("normalizedWords are the accent-free lowercase forms of the phrase words", async () => {
    const { puzzle } = await getTodaysVresTinFrasiPuzzle("2026-05-12");
    const expected = puzzle.phrase.split(" ").map((w) => normalizeLetters(w));
    expect(puzzle.normalizedWords).toEqual(expected);
  });

  it("wordLengths mirror the normalizedWords lengths", async () => {
    const { puzzle } = await getTodaysVresTinFrasiPuzzle("2026-05-12");
    expect(puzzle.wordLengths).toEqual(puzzle.normalizedWords.map((w) => w.length));
  });

  it("returns a puzzle for any date (rotation never runs out)", async () => {
    const { puzzle } = await getTodaysVresTinFrasiPuzzle("1999-01-01");
    expect(puzzle.phrase.length).toBeGreaterThan(0);
    expect(puzzle.normalizedWords.length).toBeGreaterThan(0);
  });
});

// ── The community read is gone ────────────────────────────────────────────────

describe("getTodaysVresTinFrasiPuzzle — community read removed", () => {
  it("ignores a community row even when the queue returns one", async () => {
    const { puzzle } = await getTodaysVresTinFrasiPuzzle("2026-07-01");
    expect(puzzle.phrase).not.toBe("Καλή μέρα φίλε");
  });
});

// ── getTodayDateString ────────────────────────────────────────────────────────

describe("getTodayDateString", () => {
  it("returns an ISO YYYY-MM-DD string", () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

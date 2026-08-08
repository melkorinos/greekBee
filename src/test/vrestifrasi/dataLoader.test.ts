// dataLoader.test.ts — unit tests for the Vres Tin Frasi data layer.
// Verifies: community queue consumption, deterministic static fallback, and
// buildPuzzle's multi-word normalisation (accents stripped, lengths derived).
// Supabase is mocked; default returns error → static fallback path.

import { describe, expect, it, vi } from "vitest";

import { getTodayDateString, getTodaysVresTinFrasiPuzzle } from "@/data/vrestifrasi";
import { normalizeLetters } from "@/lib/normalize";

// ── Supabase mock (same chain shape as the Leksindeseis loader test) ──────────

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

// ── getTodaysVresTinFrasiPuzzle — static fallback ─────────────────────────────

describe("getTodaysVresTinFrasiPuzzle — static fallback", () => {
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

  it("submitter_name is null on static fallback", async () => {
    const { submitter_name } = await getTodaysVresTinFrasiPuzzle("2026-05-12");
    expect(submitter_name).toBeNull();
  });

  it("returns a puzzle for any date (rotation never runs out)", async () => {
    const { puzzle } = await getTodaysVresTinFrasiPuzzle("1999-01-01");
    expect(puzzle.phrase.length).toBeGreaterThan(0);
    expect(puzzle.normalizedWords.length).toBeGreaterThan(0);
  });
});

// ── getTodaysVresTinFrasiPuzzle — community queue path ────────────────────────

describe("getTodaysVresTinFrasiPuzzle — community queue", () => {
  it("uses the community phrase and normalises its accented words", async () => {
    _mockResult = {
      data: { id: 10, submitter_name: "Μαρία", data: { phrase: "Καλή μέρα φίλε" } },
      error: null,
    };
    const { puzzle, submitter_name } = await getTodaysVresTinFrasiPuzzle("2026-07-01");
    expect(puzzle.phrase).toBe("Καλή μέρα φίλε");           // display keeps accents
    expect(puzzle.normalizedWords).toEqual(["καλη", "μερα", "φιλε"]); // state is accent-free
    expect(puzzle.wordLengths).toEqual([4, 4, 4]);
    expect(submitter_name).toBe("Μαρία");
    _mockResult = { data: null, error: { message: "no rows" } };
  });

  it("puzzle id and date are set to the requested date", async () => {
    _mockResult = {
      data: { id: 11, submitter_name: "", data: { phrase: "Ψωμί και νερό" } },
      error: null,
    };
    const { puzzle } = await getTodaysVresTinFrasiPuzzle("2026-07-02");
    expect(puzzle.id).toBe("2026-07-02-vresi");
    expect(puzzle.date).toBe("2026-07-02");
    _mockResult = { data: null, error: { message: "no rows" } };
  });

  it("submitter_name is null when the row has an empty string", async () => {
    _mockResult = {
      data: { id: 12, submitter_name: "", data: { phrase: "Ψωμί και νερό" } },
      error: null,
    };
    const { submitter_name } = await getTodaysVresTinFrasiPuzzle("2026-07-03");
    expect(submitter_name).toBeNull();
    _mockResult = { data: null, error: { message: "no rows" } };
  });
});

// ── getTodayDateString ────────────────────────────────────────────────────────

describe("getTodayDateString", () => {
  it("returns an ISO YYYY-MM-DD string", () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

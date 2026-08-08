// Tests for the Leksiarxeio data loader.
// Verifies: community queue consumption, static fallback, determinism, and multi-length support.
// Supabase is mocked so tests cover both the community path and the static fallback path.

import { LEKSIARXEIO_LENGTHS, getAllTodaysLeksiarxeioPuzzles, getAnswerPool, getTodayDateString, getValidWords } from "@/data/leksiarxeio";
import { describe, expect, it, vi } from "vitest";

// ── Supabase mock (returns error → triggers static fallback by default) ────────

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

// ── getAllTodaysLeksiarxeioPuzzles — static fallback ───────────────────────────

describe("getAllTodaysLeksiarxeioPuzzles — static fallback", () => {
  it("returns 5 puzzles (lengths 4–8)", async () => {
    const { puzzles } = await getAllTodaysLeksiarxeioPuzzles("2026-01-01");
    expect(puzzles).toHaveLength(5);
    expect(puzzles.map((p) => p.length)).toEqual([4, 5, 6, 7, 8]);
  });

  it("each answer is in the valid-words list for that length", async () => {
    const { puzzles } = await getAllTodaysLeksiarxeioPuzzles("2026-01-01");
    for (const p of puzzles) {
      expect(getValidWords(p.length)).toContain(p.answer);
    }
  });

  it("each answer has the correct character length", async () => {
    const { puzzles } = await getAllTodaysLeksiarxeioPuzzles("2026-01-01");
    for (const p of puzzles) {
      expect(p.answer).toHaveLength(p.length);
    }
  });

  it("is deterministic — same date always returns the same answers", async () => {
    const a = await getAllTodaysLeksiarxeioPuzzles("2026-05-12");
    const b = await getAllTodaysLeksiarxeioPuzzles("2026-05-12");
    expect(a.puzzles.map((p) => p.answer)).toEqual(b.puzzles.map((p) => p.answer));
  });

  it("returns a different answer on a different date", async () => {
    const a = await getAllTodaysLeksiarxeioPuzzles("2026-01-01");
    const b = await getAllTodaysLeksiarxeioPuzzles("2026-01-02");
    // At least one length should differ
    const differs = a.puzzles.some((p, i) => p.answer !== b.puzzles[i].answer);
    expect(differs).toBe(true);
  });

  it("puzzle id encodes the date and length", async () => {
    const { puzzles } = await getAllTodaysLeksiarxeioPuzzles("2026-03-15");
    for (const p of puzzles) {
      expect(p.id).toBe(`2026-03-15-wordle-${p.length}`);
      expect(p.date).toBe("2026-03-15");
    }
  });

  it("submitter_name is null on static fallback", async () => {
    const { submitter_name } = await getAllTodaysLeksiarxeioPuzzles("2026-01-01");
    expect(submitter_name).toBeNull();
  });
});

// ── getAllTodaysLeksiarxeioPuzzles — community queue path ─────────────────────

describe("getAllTodaysLeksiarxeioPuzzles — community queue", () => {
  it("uses community puzzle words when a row is found", async () => {
    _mockResult = {
      data: {
        id: 1,
        submitter_name: "Νίκος",
        data: { "4": "αγαπ", "5": "αγαπη", "6": "αγαπαω", "7": "αγαπαμε", "8": "αγαπαστε" },
      },
      error: null,
    };
    const { puzzles, submitter_name } = await getAllTodaysLeksiarxeioPuzzles("2026-06-01");
    expect(puzzles[0].answer).toBe("αγαπ");
    expect(puzzles[1].answer).toBe("αγαπη");
    expect(submitter_name).toBe("Νίκος");
    // Reset
    _mockResult = { data: null, error: { message: "no rows" } };
  });

  it("puzzle ids still use the date format", async () => {
    _mockResult = {
      data: {
        id: 2,
        submitter_name: "",
        data: { "4": "αγαπ", "5": "αγαπη", "6": "αγαπαω", "7": "αγαπαμε", "8": "αγαπαστε" },
      },
      error: null,
    };
    const { puzzles } = await getAllTodaysLeksiarxeioPuzzles("2026-06-02");
    expect(puzzles[0].id).toBe("2026-06-02-wordle-4");
    _mockResult = { data: null, error: { message: "no rows" } };
  });

  it("submitter_name is null when the row has an empty string", async () => {
    _mockResult = {
      data: {
        id: 3,
        submitter_name: "",
        data: { "4": "αγαπ", "5": "αγαπη", "6": "αγαπαω", "7": "αγαπαμε", "8": "αγαπαστε" },
      },
      error: null,
    };
    const { submitter_name } = await getAllTodaysLeksiarxeioPuzzles("2026-06-03");
    expect(submitter_name).toBeNull();
    _mockResult = { data: null, error: { message: "no rows" } };
  });
});

// ── getValidWords ─────────────────────────────────────────────────────────────

describe("getValidWords", () => {
  it("returns non-empty arrays for all supported lengths", () => {
    for (const len of LEKSIARXEIO_LENGTHS) {
      expect(getValidWords(len).length).toBeGreaterThan(0);
    }
  });

  it("all words in each list match the declared length", () => {
    for (const len of LEKSIARXEIO_LENGTHS) {
      const words = getValidWords(len);
      expect(words.every((w) => w.length === len)).toBe(true);
    }
  });

  it("all words are lowercase with no accents", () => {
    for (const len of LEKSIARXEIO_LENGTHS) {
      const words = getValidWords(len);
      expect(
        words.every((w) => w === w.normalize("NFD").replace(/[̀-ͯ]/g, ""))
      ).toBe(true);
    }
  });
});

// ── getAnswerPool ─────────────────────────────────────────────────────────────

describe("getAnswerPool", () => {
  it("every answer pool word is in the valid-words list for that length", () => {
    for (const len of LEKSIARXEIO_LENGTHS) {
      const valid = new Set(getValidWords(len));
      const pool  = getAnswerPool(len);
      expect(pool.every((w) => valid.has(w))).toBe(true);
    }
  });

  it("returns a non-empty pool for all supported lengths", () => {
    for (const len of LEKSIARXEIO_LENGTHS) {
      expect(getAnswerPool(len).length).toBeGreaterThan(0);
    }
  });

  it("answer pool is smaller than or equal to the full word list", () => {
    for (const len of LEKSIARXEIO_LENGTHS) {
      expect(getAnswerPool(len).length).toBeLessThanOrEqual(getValidWords(len).length);
    }
  });
});

// ── getTodayDateString ────────────────────────────────────────────────────────

describe("getTodayDateString", () => {
  it("returns a valid ISO date string", () => {
    const d = getTodayDateString();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

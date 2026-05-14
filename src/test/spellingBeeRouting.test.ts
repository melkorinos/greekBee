// spellingBeeRouting.test.ts — tests for the /spelling-bee routing contract.
//
// The /spelling-bee page is a pure redirect gateway:
//   - no params      → today's puzzle  → redirect to /spelling-bee/[center]/[outer]
//   - ?random=1      → random puzzle   → redirect to /spelling-bee/[center]/[outer]
//   - ?puzzle=<id>   → that puzzle     → redirect to /spelling-bee/[center]/[outer]
//
// These tests verify that every puzzle's letter fields produce a URL that
// parseCustomUrl can round-trip successfully — i.e. the redirect target is
// always a valid, playable custom-URL game.  If any puzzle in puzzles-el.json
// has invalid letter fields, the redirect would produce a URL that 404s.

import { describe, expect, it } from "vitest";
import {
  getPuzzleById,
  getPuzzleForDate,
  getRandomPuzzle,
  getTodaysPuzzle,
} from "@/data/spelling-bee";

import type { Puzzle } from "@/games/spelling-bee/types";
import { parseCustomUrl } from "@/games/spelling-bee/lib/parseCustomUrl";
import puzzlesEl from "@/data/spelling-bee/puzzles-el.json";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Builds the canonical redirect path exactly as the page does. */
function canonicalPath(puzzle: Puzzle): string {
  return `/spelling-bee/${puzzle.centerLetter}/${puzzle.outerLetters.join("")}`;
}

/**
 * Builds the encoded redirect path exactly as the page does after the
 * ERR_INVALID_CHAR fix — letters are percent-encoded so the Location header
 * contains only ASCII-safe bytes.
 */
function encodedRedirectPath(puzzle: Puzzle): string {
  return `/spelling-bee/${encodeURIComponent(puzzle.centerLetter)}/${encodeURIComponent(puzzle.outerLetters.join(""))}`;
}

/**
 * Asserts that the canonical path for a puzzle round-trips through
 * parseCustomUrl successfully — i.e. the redirect URL will not 404.
 */
function expectValidRedirect(puzzle: Puzzle, label: string) {
  const path = canonicalPath(puzzle);
  // Extract the [center] and [outer] segments from the path
  const parts = path.split("/"); // ['', 'spelling-bee', center, outer]
  const center = parts[2];
  const outer = parts[3];

  const parsed = parseCustomUrl(center, outer);
  expect(
    parsed,
    `Redirect target "${path}" (${label}) would 404 — parseCustomUrl returned null`
  ).not.toBeNull();
}

// ── Encoded redirect path — ASCII-safe Location header ──────────────────────
// Regression for ERR_INVALID_CHAR: raw Greek Unicode in the Location header
// is rejected by Node.js. The page must percent-encode letter segments.

describe("encoded redirect path — ASCII-safe Location header", () => {
  it("encodeURIComponent of center letter contains no raw non-ASCII bytes", () => {
    const p = getPuzzleForDate("2026-03-25");
    const encoded = encodeURIComponent(p.centerLetter);
    // All characters in an encoded segment must be ASCII
    expect([...encoded].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
  });

  it("encodeURIComponent of outer letters contains no raw non-ASCII bytes", () => {
    const p = getPuzzleForDate("2026-03-25");
    const encoded = encodeURIComponent(p.outerLetters.join(""));
    expect([...encoded].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
  });

  it("encoded path decodes back to the original letters", () => {
    const p = getPuzzleForDate("2026-03-25");
    const path = encodedRedirectPath(p);
    const parts = path.split("/"); // ['', 'spelling-bee', encodedCenter, encodedOuter]
    expect(decodeURIComponent(parts[2])).toBe(p.centerLetter);
    expect(decodeURIComponent(parts[3])).toBe(p.outerLetters.join(""));
  });

  it("encoded path still round-trips through parseCustomUrl", () => {
    const p = getRandomPuzzle("el");
    const path = encodedRedirectPath(p);
    const parts = path.split("/");
    // Next.js decodes params before passing to the page handler
    const decoded_center = decodeURIComponent(parts[2]);
    const decoded_outer  = decodeURIComponent(parts[3]);
    const parsed = parseCustomUrl(decoded_center, decoded_outer);
    expect(parsed).not.toBeNull();
    expect(parsed!.center).toBe(p.centerLetter);
    expect(parsed!.outer).toEqual(p.outerLetters);
  });

  it("all 1,008 curated puzzles produce ASCII-safe encoded redirect paths", () => {
    const failures: string[] = [];
    for (const puzzle of puzzlesEl as Puzzle[]) {
      const path = encodedRedirectPath(puzzle);
      const hasRawNonAscii = [...path].some((ch) => ch.charCodeAt(0) >= 128);
      if (hasRawNonAscii) failures.push(puzzle.id);
    }
    expect(
      failures,
      `${failures.length} puzzle(s) produce non-ASCII Location header bytes:\n${failures.join("\n")}`
    ).toHaveLength(0);
  });
});

// ── Encoded redirect path — ASCII-safe Location header ───────────────────────
// Regression for ERR_INVALID_CHAR: raw Greek Unicode in the Location header
// is rejected by Node.js. The page must percent-encode letter segments.

describe("encoded redirect path — ASCII-safe Location header", () => {
  it("encodeURIComponent of center letter contains no raw non-ASCII bytes", () => {
    const p = getPuzzleForDate("2026-03-25");
    const encoded = encodeURIComponent(p.centerLetter);
    expect([...encoded].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
  });

  it("encodeURIComponent of outer letters contains no raw non-ASCII bytes", () => {
    const p = getPuzzleForDate("2026-03-25");
    const encoded = encodeURIComponent(p.outerLetters.join(""));
    expect([...encoded].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
  });

  it("encoded path decodes back to the original letters", () => {
    const p = getPuzzleForDate("2026-03-25");
    const path = encodedRedirectPath(p);
    const parts = path.split("/"); // ['', 'spelling-bee', encodedCenter, encodedOuter]
    expect(decodeURIComponent(parts[2])).toBe(p.centerLetter);
    expect(decodeURIComponent(parts[3])).toBe(p.outerLetters.join(""));
  });

  it("encoded path still round-trips through parseCustomUrl", () => {
    const p = getRandomPuzzle("el");
    const path = encodedRedirectPath(p);
    const parts = path.split("/");
    // Next.js decodes params before passing to the page handler
    const decodedCenter = decodeURIComponent(parts[2]);
    const decodedOuter  = decodeURIComponent(parts[3]);
    const parsed = parseCustomUrl(decodedCenter, decodedOuter);
    expect(parsed).not.toBeNull();
    expect(parsed!.center).toBe(p.centerLetter);
    expect(parsed!.outer).toEqual(p.outerLetters);
  });

  it("all 1,008 curated puzzles produce ASCII-safe encoded redirect paths", () => {
    const failures: string[] = [];
    for (const puzzle of puzzlesEl as Puzzle[]) {
      const path = encodedRedirectPath(puzzle);
      const hasRawNonAscii = [...path].some((ch) => ch.charCodeAt(0) >= 128);
      if (hasRawNonAscii) failures.push(puzzle.id);
    }
    expect(
      failures,
      `${failures.length} puzzle(s) produce non-ASCII Location header bytes:\n${failures.join("\n")}`
    ).toHaveLength(0);
  });
});

// ── Canonical path format ─────────────────────────────────────────────────────

describe("canonicalPath format", () => {
  it("produces a path starting with /spelling-bee/", () => {
    const p = getPuzzleForDate("2026-03-25");
    expect(canonicalPath(p)).toMatch(/^\/spelling-bee\/.+\/.+$/);
  });

  it("center segment is exactly 1 character", () => {
    const p = getPuzzleForDate("2026-03-25");
    const parts = canonicalPath(p).split("/");
    expect(parts[2]).toHaveLength(1);
  });

  it("outer segment is exactly 6 characters", () => {
    const p = getPuzzleForDate("2026-03-25");
    const parts = canonicalPath(p).split("/");
    expect(parts[3]).toHaveLength(6);
  });

  it("path is accent-free", () => {
    const p = getPuzzleForDate("2026-03-25");
    const path = canonicalPath(p);
    const hasAccent = path.normalize("NFD").split("").some((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp >= 0x0300 && cp <= 0x036f;
    });
    expect(hasAccent).toBe(false);
  });
});

// ── Round-trip: puzzle → canonical path → parseCustomUrl ─────────────────────

describe("redirect round-trip — getTodaysPuzzle", () => {
  it("today's puzzle produces a valid redirect target", () => {
    const p = getTodaysPuzzle();
    expectValidRedirect(p, "today's puzzle");
  });

  it("today's puzzle canonical path parses back to the same letters", () => {
    const p = getTodaysPuzzle();
    const parts = canonicalPath(p).split("/");
    const parsed = parseCustomUrl(parts[2], parts[3]);
    expect(parsed!.center).toBe(p.centerLetter);
    expect(parsed!.outer).toEqual(p.outerLetters);
  });
});

describe("redirect round-trip — getPuzzleForDate", () => {
  it("a known date's puzzle produces a valid redirect target", () => {
    const p = getPuzzleForDate("2026-03-25");
    expectValidRedirect(p, "2026-03-25");
  });
});

describe("redirect round-trip — getPuzzleById", () => {
  it("a puzzle fetched by ID produces a valid redirect target", () => {
    const p = getPuzzleById("2026-03-25-el", "el");
    expectValidRedirect(p!, "2026-03-25-el");
  });
});

describe("redirect round-trip — getRandomPuzzle", () => {
  it("a random puzzle produces a valid redirect target", () => {
    const p = getRandomPuzzle("el");
    expectValidRedirect(p, "random");
  });
});

// ── All 1,008 curated puzzles produce valid redirect targets ──────────────────
// This is the definitive guard: if puzzles-el.json ever gets a puzzle with
// invalid letter fields (wrong length, duplicate letters, accents), this test
// catches it before it reaches production and causes a 404.

describe("all curated puzzles — redirect round-trip", () => {
  const puzzles = puzzlesEl as Puzzle[];

  it(`all ${puzzles.length} puzzles produce a canonical path that parseCustomUrl accepts`, () => {
    const failures: string[] = [];

    for (const puzzle of puzzles) {
      const path = canonicalPath(puzzle);
      const parts = path.split("/");
      const parsed = parseCustomUrl(parts[2], parts[3]);
      if (!parsed) {
        failures.push(`${puzzle.id}: "${path}"`);
      }
    }

    expect(
      failures,
      `${failures.length} puzzle(s) would produce a 404 redirect:\n${failures.join("\n")}`
    ).toHaveLength(0);
  });

  it("all parsed center letters match the original puzzle's centerLetter", () => {
    for (const puzzle of puzzles) {
      const parts = canonicalPath(puzzle).split("/");
      const parsed = parseCustomUrl(parts[2], parts[3]);
      expect(parsed?.center).toBe(puzzle.centerLetter);
    }
  });

  it("all parsed outer letter arrays match the original puzzle's outerLetters", () => {
    for (const puzzle of puzzles) {
      const parts = canonicalPath(puzzle).split("/");
      const parsed = parseCustomUrl(parts[2], parts[3]);
      expect(parsed?.outer).toEqual(puzzle.outerLetters);
    }
  });
});

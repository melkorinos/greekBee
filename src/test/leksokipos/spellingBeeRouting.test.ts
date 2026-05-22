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

import type { SpellingBeePuzzle } from "@/games/leksokipos/types";
import { greekToGreeklish } from "@/lib/greeklish";
import { parseCustomUrl } from "@/games/leksokipos/lib/parseCustomUrl";
import puzzlesEl from "@/data/spelling-bee/puzzles-el.json";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Builds the canonical greeklish redirect path exactly as the page does. */
function canonicalPath(puzzle: SpellingBeePuzzle): string {
  return `/spelling-bee/${greekToGreeklish(puzzle.centerLetter)}/${greekToGreeklish(puzzle.outerLetters.join(""))}`;
}

/**
 * Builds the encoded redirect path (kept for regression tests that verify the
 * old percent-encoded Greek form — parseCustomUrl still accepts those).
 */
function encodedRedirectPath(puzzle: SpellingBeePuzzle): string {
  return `/spelling-bee/${encodeURIComponent(puzzle.centerLetter)}/${encodeURIComponent(puzzle.outerLetters.join(""))}`;
}

/**
 * Asserts that the canonical path for a puzzle round-trips through
 * parseCustomUrl successfully — i.e. the redirect URL will not 404.
 */
function expectValidRedirect(puzzle: SpellingBeePuzzle, label: string) {
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

// ── Greeklish canonical path — ASCII-only, no percent-encoding needed ──────────
// The new canonical URL format uses greeklish (plain ASCII letters) so shared
// links are clean and there is no ERR_INVALID_CHAR risk in Location headers.

describe("greeklish canonical path — ASCII-only", () => {
  it("canonical path contains only ASCII characters", () => {
    const p = getPuzzleForDate("2026-03-25");
    const path = canonicalPath(p);
    expect([...path].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
  });

  it("canonical path round-trips through parseCustomUrl", () => {
    const p = getRandomPuzzle("el");
    const path = canonicalPath(p);
    const parts = path.split("/");
    const parsed = parseCustomUrl(parts[2], parts[3]);
    expect(parsed).not.toBeNull();
    expect(parsed!.center).toBe(p.centerLetter);
    expect(parsed!.outer).toEqual(p.outerLetters);
  });

  it("all 1,008 pre-built puzzles produce ASCII-only canonical paths", () => {
    const failures: string[] = [];
    for (const puzzle of puzzlesEl as SpellingBeePuzzle[]) {
      const path = canonicalPath(puzzle);
      const hasNonAscii = [...path].some((ch) => ch.charCodeAt(0) >= 128);
      if (hasNonAscii) failures.push(puzzle.id);
    }
    expect(
      failures,
      `${failures.length} puzzle(s) produce non-ASCII canonical paths:\n${failures.join("\n")}`,
    ).toHaveLength(0);
  });
});

// ── Backward-compat: old percent-encoded Greek URLs still parse correctly ──────
// parseCustomUrl accepts both greeklish (new) and percent-decoded Greek (old).
// This ensures old bookmarks and server-redirect paths continue to work.

describe("backward-compat — old percent-encoded Greek URLs", () => {
  it("percent-decoded Greek center + outer still parse correctly", () => {
    const p = getPuzzleForDate("2026-03-25");
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

  it("all 1,008 pre-built puzzles round-trip through the old encoded form", () => {
    const failures: string[] = [];
    for (const puzzle of puzzlesEl as SpellingBeePuzzle[]) {
      const path = encodedRedirectPath(puzzle);
      const parts = path.split("/");
      const parsed = parseCustomUrl(
        decodeURIComponent(parts[2]),
        decodeURIComponent(parts[3]),
      );
      if (!parsed) failures.push(puzzle.id);
    }
    expect(
      failures,
      `${failures.length} puzzle(s) fail backward-compat parse:\n${failures.join("\n")}`,
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

  it("path contains only ASCII characters (greeklish — no percent-encoding needed)", () => {
    const p = getPuzzleForDate("2026-03-25");
    const path = canonicalPath(p);
    expect([...path].every((ch) => ch.charCodeAt(0) < 128)).toBe(true);
  });

  it("path contains only lowercase a-z letters, hyphens and slashes", () => {
    const p = getPuzzleForDate("2026-03-25");
    const path = canonicalPath(p);
    expect(/^[a-z\-/]+$/.test(path)).toBe(true);
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

describe("all pre-built puzzles — redirect round-trip", () => {
  const puzzles = puzzlesEl as SpellingBeePuzzle[];

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

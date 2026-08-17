// puzzleIndex.test.ts
//
// Guards the slim puzzle index (puzzles-index-el.json) that the /leksokipos
// redirect page uses instead of the full 4 MB puzzles-el.json (Fluid CPU cost —
// see src/data/leksokipos/puzzleIndex.ts).
//
// 1. Drift guard: the committed index must be exactly re-derivable from
//    puzzles-el.json. If a script changes puzzles (generate-puzzle,
//    batch-generate), run `npm run generate-puzzle-index` to refresh it.
// 2. Parity: the stub lookups must behave identically to their full-loader
//    counterparts — the redirect page and the [center]/[outer] page must agree
//    on which puzzle a date maps to.

import { describe, expect, it } from "vitest";

import {
  getPrebuiltPuzzleParams,
  getPuzzleStubForDate,
  getRandomPuzzleStub,
  getTodaysPuzzleStub,
} from "@/data/leksokipos/puzzleIndex";
import { getPuzzleForDate, getTodaysPuzzle } from "@/data/leksokipos/index";
import fullPuzzles from "@/data/leksokipos/puzzles-el.json";
import puzzleIndex from "@/data/leksokipos/puzzles-index-el.json";
import { greekToGreeklish } from "@/lib/greeklish";
import { parseCustomUrl } from "@/games/leksokipos/lib/parseCustomUrl";

interface FullPuzzle {
  id: string;
  date: string;
  centerLetter: string;
  outerLetters: string[];
}

const FULL = fullPuzzles as FullPuzzle[];

describe("puzzles-index-el.json — drift guard", () => {
  it("is exactly re-derivable from puzzles-el.json (run `npm run generate-puzzle-index` if this fails)", () => {
    const derived = FULL.map(({ id, date, centerLetter, outerLetters }) => ({
      id,
      date,
      centerLetter,
      outerLetters,
    }));
    expect(puzzleIndex).toEqual(derived);
  });

  it("carries no validWords (the whole point is staying small)", () => {
    for (const stub of puzzleIndex as Record<string, unknown>[]) {
      expect(stub).not.toHaveProperty("validWords");
    }
  });
});

describe("puzzleIndex — parity with the full loader", () => {
  it("getPuzzleStubForDate matches getPuzzleForDate for a known date", () => {
    const date = FULL[0].date;
    const stub = getPuzzleStubForDate(date);
    const full = getPuzzleForDate(date);

    expect(stub.id).toBe(full.id);
    expect(stub.centerLetter).toBe(full.centerLetter);
    expect(stub.outerLetters).toEqual(full.outerLetters);
  });

  it("resolves an unknown date to the same puzzle as the full loader", () => {
    // Both delegate their miss rule to pickByDateOrRotate, so parity holds on
    // either side of the calendar's ends.
    for (const date of ["1900-01-01", "2030-06-15"]) {
      expect(getPuzzleStubForDate(date).id).toBe(getPuzzleForDate(date).id);
    }
  });

  it("getTodaysPuzzleStub matches getTodaysPuzzle", () => {
    expect(getTodaysPuzzleStub().id).toBe(getTodaysPuzzle().id);
  });

  it("getRandomPuzzleStub respects excludeId and returns a real puzzle", () => {
    const excluded = FULL[0].id;
    for (let i = 0; i < 20; i++) {
      const stub = getRandomPuzzleStub("el", excluded);
      expect(stub.id).not.toBe(excluded);
      expect(FULL.some((p) => p.id === stub.id)).toBe(true);
    }
  });
});

// ── Prerender params (generateStaticParams source) ────────────────────────────
// The [center]/[outer] page prerenders every prebuilt combo at build time so
// the CDN serves daily-puzzle traffic with zero Fluid CPU. A param pair that
// parseCustomUrl rejects would fail the build; a non-canonical pair would
// prerender a page that instantly 301s to itself — both guarded here.

describe("getPrebuiltPuzzleParams — one canonical param pair per prebuilt puzzle", () => {
  const params = getPrebuiltPuzzleParams("el");

  it("returns one param pair per index entry", () => {
    expect(params).toHaveLength(FULL.length);
  });

  it("every param is lowercase greeklish: 1 center letter + 6 outer letters", () => {
    for (const p of params) {
      expect(p.center).toMatch(/^[a-z]$/);
      expect(p.outer).toMatch(/^[a-z]{6}$/);
    }
  });

  it("every param round-trips through parseCustomUrl to the puzzle's letters in file order", () => {
    params.forEach((p, i) => {
      const parsed = parseCustomUrl(p.center, p.outer);
      expect(parsed, `param ${p.center}/${p.outer} (index ${i}) failed to parse`).not.toBeNull();
      expect(parsed!.center).toBe(FULL[i].centerLetter);
      expect(parsed!.outer).toEqual(FULL[i].outerLetters);
    });
  });

  it("every param is already canonical — the page's redirect check must not fire", () => {
    // Mirrors the comparison in src/app/leksokipos/[center]/[outer]/page.tsx:
    // a mismatch there means the prerendered page 301s to itself.
    for (const p of params) {
      const parsed = parseCustomUrl(p.center, p.outer)!;
      expect(decodeURIComponent(p.center)).toBe(greekToGreeklish(parsed.center));
      expect(decodeURIComponent(p.outer)).toBe(greekToGreeklish(parsed.outer.join("")));
    }
  });
});
